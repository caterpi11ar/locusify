import { useCallback, useEffect, useRef, useState } from 'react'
import { createRecordingOptions } from '@/lib/replay/recording-options'
import { getReplaySurface } from '@/lib/replay/scene-registry'
import { useReplayStore } from '@/stores/replayStore'

export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'processing'
export type RecordingFailureReason = 'busy' | 'encoder-unsupported' | 'asset-unavailable' | 'avatar-unavailable' | 'map-unavailable' | 'render-failed' | 'encoding-failed' | 'cancelled' | 'export-unavailable'
export type StartRecordingResult = { ok: true } | { ok: false, reason: RecordingFailureReason }
export interface PendingVideo { blob: Blob, mimeType: 'video/mp4', width: number, height: number }

function failureReason(cause: unknown): RecordingFailureReason {
  const reasons: RecordingFailureReason[] = ['busy', 'encoder-unsupported', 'asset-unavailable', 'avatar-unavailable', 'map-unavailable', 'export-unavailable']
  return reasons.find(reason => cause instanceof Error && cause.message === reason) ?? 'render-failed'
}

export function useVideoRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null)
  const [error, setError] = useState<RecordingFailureReason | null>(null)
  const [progress, setProgress] = useState(0)
  const active = useRef<{ controller: AbortController } | null>(null)

  const startRecording = useCallback(async (element?: HTMLElement | null, preparation: Promise<void> = Promise.resolve()): Promise<StartRecordingResult> => {
    void preparation.catch(() => {})
    if (active.current)
      return { ok: false, reason: 'busy' }
    if (!element)
      return { ok: false, reason: 'render-failed' }
    const job = { controller: new AbortController() }
    const { signal } = job.controller
    active.current = job
    setStatus('starting')
    setError(null)
    setPendingVideo(null)
    setProgress(0)
    try {
      // The job belongs to this page and never leaves the browser.
      await preparation
      signal.throwIfAborted()
      const request = createRecordingOptions()
      signal.throwIfAborted()
      const surface = await getReplaySurface(element)
      signal.throwIfAborted()
      const { done } = await surface.start(request, signal, setProgress)
      setStatus('recording')
      void done.then((video) => {
        if (active.current !== job)
          return
        setPendingVideo(video)
        setProgress(100)
        setStatus('idle')
        active.current = null
      }).catch((cause) => {
        if (signal.aborted || active.current !== job)
          return
        console.error('[export] Background render failed', cause)
        setError(failureReason(cause))
        setStatus('idle')
        active.current = null
        useReplayStore.getState().setRecordingActive(false)
      })
      return { ok: true }
    }
    catch (cause) {
      if (signal.aborted)
        return { ok: false, reason: 'cancelled' }
      if (active.current === job)
        active.current = null
      setStatus('idle')
      console.error('[export] Could not submit replay', cause)
      return { ok: false, reason: failureReason(cause) }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (active.current)
      setStatus('processing')
  }, [])

  useEffect(() => useReplayStore.subscribe((state, previous) => {
    if (state.status === 'completed' && previous.status !== 'completed')
      stopRecording()
  }), [stopRecording])

  const dispose = useCallback(() => {
    const job = active.current
    active.current = null
    job?.controller.abort()
    useReplayStore.getState().setRecordingActive(false)
  }, [])

  const discardVideo = useCallback(() => {
    dispose()
    setPendingVideo(null)
    setError(null)
    setStatus('idle')
    setProgress(0)
  }, [dispose])

  const saveVideo = useCallback(() => {
    if (!pendingVideo)
      return
    const url = URL.createObjectURL(pendingVideo.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `locusify-${Date.now()}.mp4`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    setPendingVideo(null)
    useReplayStore.getState().setRecordingActive(false)
  }, [pendingVideo])

  useEffect(() => {
    window.addEventListener('pagehide', discardVideo)
    return () => {
      window.removeEventListener('pagehide', discardVideo)
      dispose()
    }
  }, [dispose, discardVideo])
  return { status, pendingVideo, progress, error, startRecording, stopRecording, saveVideo, discardVideo, isRecording: status === 'recording', isProcessing: status === 'starting' || status === 'processing' }
}
