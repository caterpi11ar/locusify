import { useCallback, useEffect, useRef, useState } from 'react'
import { convertWebmToMp4 } from '@/lib/webm-to-mp4'
import { useReplayStore } from '@/stores/replayStore'

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'unsupported'

// ─── Capability detection ──────────────────────────────────────────────────────

function detectCapability(): 'screen-capture' | 'unsupported' {
  if (typeof navigator.mediaDevices?.getDisplayMedia === 'function') {
    return 'screen-capture'
  }
  return 'unsupported'
}

// ─── Timing constants ──────────────────────────────────────────────────────────

/** How long to keep recording after replay completes before stopping. */
const WAIT_MS = 2000

// ─── Session callbacks ─────────────────────────────────────────────────────────

interface SessionCallbacks {
  /** Called the moment the session decides to stop (transition to 'processing'). */
  onStopping: () => void
  /** Called once the encoded blob is ready (transition to 'idle'). */
  onComplete: (blob: Blob) => void | Promise<void>
}

// ─── ScreenRecordingSession ────────────────────────────────────────────────────

class ScreenRecordingSession {
  private recorder: MediaRecorder
  private stream: MediaStream
  private chunks: Blob[] = []
  private callbacks: SessionCallbacks
  private mimeType: string

  static async create(
    callbacks: SessionCallbacks,
    cropElement?: HTMLElement,
  ): Promise<ScreenRecordingSession | null> {
    try {
      // Pre-create CropTarget before getDisplayMedia (must be called before capture starts)
      let cropTarget: CropTarget | null = null
      if (cropElement && typeof CropTarget !== 'undefined') {
        try {
          cropTarget = await CropTarget.fromElement(cropElement)
        }
        catch { /* Region Capture unavailable — continue without cropping */ }
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          suppressLocalAudioPlayback: true,
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
      } as DisplayMediaStreamOptions)

      // Crop the captured stream to the target element's bounding box
      if (cropTarget) {
        try {
          const videoTrack = stream.getVideoTracks()[0] as BrowserCaptureMediaStreamTrack
          if (typeof videoTrack.cropTo === 'function') {
            await videoTrack.cropTo(cropTarget)
          }
        }
        catch { /* cropTo failed — continue with full-tab capture */ }
      }

      return new ScreenRecordingSession(stream, callbacks)
    }
    catch {
      return null // user denied or not supported
    }
  }

  private constructor(stream: MediaStream, callbacks: SessionCallbacks) {
    this.stream = stream
    this.callbacks = callbacks

    // MIME type priority — prefer WebM (VP9/VP8) for screen capture streams;
    // H.264 via MediaRecorder + getDisplayMedia produces green frames on Chrome.
    this.mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'

    this.recorder = new MediaRecorder(stream, { mimeType: this.mimeType })
    this.recorder.ondataavailable = (e) => {
      if (e.data?.size > 0)
        this.chunks.push(e.data)
    }
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: this.mimeType })
      callbacks.onComplete(blob)
    }

    // User stops sharing via browser UI
    stream.getVideoTracks()[0].onended = () => {
      this.stop()
    }
  }

  start() {
    // Timeslice of 1s ensures periodic data output and avoids green-frame issues
    this.recorder.start(1000)
  }

  stop() {
    if (this.recorder.state !== 'inactive') {
      this.callbacks.onStopping()
      try {
        this.recorder.requestData()
      }
      catch { /* no-op */ }
      this.recorder.stop()
    }
    this.stream.getTracks().forEach(t => t.stop())
  }

  dispose() {
    if (this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop()
      }
      catch { /* no-op */ }
    }
    this.stream.getTracks().forEach(t => t.stop())
  }
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface PendingVideo {
  blob: Blob
  mimeType: string
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useVideoRecorder() {
  const [status, setStatus] = useState<RecordingStatus>(() => {
    return detectCapability() === 'unsupported' ? 'unsupported' : 'idle'
  })
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null)
  const [conversionProgress, setConversionProgress] = useState<number | null>(null)

  const sessionRef = useRef<ScreenRecordingSession | null>(null)

  /**
   * Starts recording using Screen Capture API.
   * Returns true if recording started successfully, false if user denied or unsupported.
   */
  const startRecording = useCallback(async (cropElement?: HTMLElement | null): Promise<boolean> => {
    if (status !== 'idle')
      return false

    const callbacks: SessionCallbacks = {
      onStopping: () => {
        setStatus('processing')
        useReplayStore.getState().setRecordingActive(false)
      },
      onComplete: async (blob) => {
        setConversionProgress(0)
        try {
          const mp4Blob = await convertWebmToMp4(blob, setConversionProgress)
          setPendingVideo({ blob: mp4Blob, mimeType: 'video/mp4' })
        }
        catch {
          // Conversion failed — fall back to original WebM
          setPendingVideo({ blob, mimeType: 'video/webm' })
        }
        setConversionProgress(null)
        setStatus('idle')
        sessionRef.current = null
      },
    }

    const session = await ScreenRecordingSession.create(callbacks, cropElement ?? undefined)
    if (!session)
      return false

    sessionRef.current = session
    session.start()
    setStatus('recording')
    useReplayStore.getState().setRecordingActive(true)
    return true
  }, [status])

  // Auto-stop recording when replay completes
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = useReplayStore.subscribe((state) => {
      if (state.status === 'completed' && sessionRef.current) {
        timeoutId = setTimeout(() => {
          sessionRef.current?.stop()
          timeoutId = null
        }, WAIT_MS)
      }
    })
    return () => {
      unsubscribe()
      if (timeoutId)
        clearTimeout(timeoutId)
    }
  }, [])

  const saveVideo = useCallback(() => {
    if (!pendingVideo)
      return
    const { blob, mimeType } = pendingVideo
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `locusify-${Date.now()}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    setPendingVideo(null)
  }, [pendingVideo])

  /** Stop the active recording session (triggers processing → pendingVideo). */
  const stopRecording = useCallback(() => {
    sessionRef.current?.stop()
  }, [])

  const discardVideo = useCallback(() => {
    sessionRef.current?.dispose()
    sessionRef.current = null
    useReplayStore.getState().setRecordingActive(false)
    setPendingVideo(null)
    setStatus(prev => (prev === 'recording' || prev === 'processing') ? 'idle' : prev)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.dispose()
      useReplayStore.getState().setRecordingActive(false)
    }
  }, [])

  return {
    status,
    pendingVideo,
    conversionProgress,
    startRecording,
    stopRecording,
    saveVideo,
    discardVideo,
    isSupported: status !== 'unsupported',
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
  }
}
