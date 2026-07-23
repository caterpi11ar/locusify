import type { RefObject } from 'react'
import type { RecordingFailureReason } from './useVideoRecorder'
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { useReplayStore } from '@/stores/replayStore'
import { useVideoRecorder } from './useVideoRecorder'

/** How long to keep recording after playback completes before stopping. */
const STOP_DELAY_MS = 2000

/**
 * Unified recording flow hook.
 *
 * Encapsulates screen-capture recording, logo intro state, auto-stop on
 * playback completion (both trajectory replay and globe orbit), and the
 * save-video dialog — so every recording mode shares the same lifecycle:
 *
 *   beginRecording(onPlaybackStart)
 *     → screen capture prompt (best-effort) → recordingActive
 *     → logo intro → onPlaybackStart callback
 *     → playback … → auto-stop → save dialog
 */
interface RecordingFlowOptions {
  cropRef?: RefObject<HTMLElement | null>
}

export function useRecordingFlow(options: RecordingFlowOptions = {}) {
  const { cropRef } = options
  const {
    startRecording,
    stopRecording,
    saveVideo: recorderSave,
    discardVideo: recorderDiscard,
    isRecording,
    isProcessing,
    pendingVideo,
    conversionProgress,
  } = useVideoRecorder()

  // Intro state
  const [introVisible, setIntroVisible] = useState(false)
  const onPlaybackStartRef = useRef<(() => void) | null>(null)

  // Save dialog state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [recordingError, setRecordingError] = useState<RecordingFailureReason | null>(null)

  // Recording active flag (shared via replayStore)
  const recordingActive = useReplayStore(s => s.recordingActive)

  // Stable refs for values needed inside store subscriptions
  const isRecordingRef = useRef(isRecording)
  isRecordingRef.current = isRecording
  const stopRecordingRef = useRef(stopRecording)
  stopRecordingRef.current = stopRecording

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Start a full recording session: screen capture (best-effort) → show intro.
   * When the intro animation finishes, `onPlaybackStart` is called so the
   * consumer can begin actual playback.
   *
   * Recording is best-effort — if screen capture is denied or unsupported,
   * the intro and playback still proceed normally.
   */
  const beginRecording = useCallback(async (onPlaybackStart: () => void) => {
    recorderDiscard()
    setRecordingError(null)
    onPlaybackStartRef.current = onPlaybackStart
    // Commit the 16:9 capture layout before CropTarget is created. The intro is
    // started only after MediaRecorder is active, so the logo is part of the
    // exported video instead of finishing behind the browser share prompt.
    flushSync(() => useReplayStore.getState().setRecordingActive(true))
    const result = await startRecording(cropRef?.current)
    if (result.ok) {
      setIntroVisible(true)
    }
    else {
      useReplayStore.getState().setRecordingActive(false)
      setRecordingError(result.reason)
      onPlaybackStartRef.current = null
    }
  }, [startRecording, recorderDiscard, cropRef])

  /**
   * Show only the intro (no new recording session).
   * Useful for pause-resume where recording is already active.
   */
  const showIntro = useCallback((onComplete: () => void) => {
    onPlaybackStartRef.current = onComplete
    setIntroVisible(true)
  }, [])

  /** Called by ReplayIntroOverlay's onExitComplete. */
  const onIntroComplete = useCallback(() => {
    setIntroVisible(false)
    onPlaybackStartRef.current?.()
    onPlaybackStartRef.current = null
  }, [])

  // ── Hide cursor during intro & recording ─────────────────────────────────
  // MapLibre sets inline cursor styles (grab, pointer) on the canvas, which
  // override `document.documentElement.style.cursor`. Use a <style> with
  // !important to force-hide the cursor during the entire recording experience.
  useEffect(() => {
    if (!recordingActive && !introVisible)
      return
    const style = document.createElement('style')
    style.textContent = '* { cursor: none !important; }'
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [recordingActive, introVisible])

  // ── Earth zoom revealing → close intro overlay ─────────────────────────────
  // When the controller advances to "revealing", fade-out the intro overlay so
  // it overlaps with the flyTo for a smooth visual transition.
  useEffect(() => {
    const unsub = useReplayStore.subscribe((state, prev) => {
      if (state.earthZoomPhase === 'revealing' && prev.earthZoomPhase !== 'revealing') {
        setIntroVisible(false)
        onPlaybackStartRef.current = null
      }
    })
    return unsub
  }, [])

  // ── Auto-stop: globe orbit completed ────────────────────────────────────────

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout> | null = null
    const unsub = useGlobeOrbitStore.subscribe((state, prev) => {
      if (state.status === 'completed' && prev.status !== 'completed' && isRecordingRef.current) {
        tid = setTimeout(() => {
          stopRecordingRef.current()
          tid = null
        }, STOP_DELAY_MS)
      }
    })
    return () => {
      unsub()
      if (tid)
        clearTimeout(tid)
    }
  }, [])

  // ── Save dialog: open after any playback completes ──────────────────────────

  const replayStatus = useReplayStore(s => s.status)
  const orbitStatus = useGlobeOrbitStore(s => s.status)

  useEffect(() => {
    const anyCompleted = replayStatus === 'completed' || orbitStatus === 'completed'
    if (!anyCompleted)
      return
    if (!isRecording && !isProcessing && !pendingVideo)
      return
    const t = setTimeout(setVideoDialogOpen, STOP_DELAY_MS, true)
    return () => clearTimeout(t)
  }, [replayStatus, orbitStatus, isRecording, isProcessing, pendingVideo])

  // ── Convenience wrappers ────────────────────────────────────────────────────

  const saveVideo = useCallback(() => {
    recorderSave()
    setVideoDialogOpen(false)
  }, [recorderSave])

  const discardVideo = useCallback(() => {
    recorderDiscard()
    setVideoDialogOpen(false)
  }, [recorderDiscard])

  const exitRecording = useCallback(() => {
    recorderDiscard()
    setVideoDialogOpen(false)
    setRecordingError(null)
  }, [recorderDiscard])

  return {
    // State
    recordingActive,
    introVisible,
    videoDialogOpen,
    isRecording,
    isProcessing,
    pendingVideo,
    conversionProgress,
    recordingError,
    // Actions
    beginRecording,
    showIntro,
    onIntroComplete,
    saveVideo,
    discardVideo,
    exitRecording,
    dismissRecordingError: () => setRecordingError(null),
  }
}
