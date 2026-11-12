import type { RefObject } from 'react'
import type { RecordingFailureReason } from './useVideoRecorder'
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { useReplayStore } from '@/stores/replayStore'
import { useReplayPreparation } from './useReplayPreparation'
import { useVideoRecorder } from './useVideoRecorder'

/** How long to keep recording after playback completes before stopping. */
const STOP_DELAY_MS = 2000

/**
 * Unified recording flow hook.
 *
 * Encapsulates Worker encoding, logo intro state, auto-stop on
 * playback completion (both trajectory replay and globe orbit), and the
 * save-video dialog — so every recording mode shares the same lifecycle:
 *
 *   configure replay → preload map, images and encoder module
 *   beginRecording(onPlaybackStart)
 *     → show opaque intro → await preparation → encode the visible canvas
 *     → wait for painted destination → intro exit → onPlaybackStart callback
 *     → playback … → auto-stop → save dialog
 */
interface RecordingFlowOptions {
  cropRef?: RefObject<HTMLElement | null>
}

export function useRecordingFlow(options: RecordingFlowOptions = {}) {
  const { cropRef } = options
  const attempt = useRef(0)
  const preparation = useReplayPreparation()
  const {
    startRecording,
    stopRecording,
    saveVideo: recorderSave,
    discardVideo: recorderDiscard,
    isRecording,
    isProcessing,
    pendingVideo,
    progress,
    error: recorderError,
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
   * Start a full recording session with the intro present in its first frame.
   * When the intro animation finishes, `onPlaybackStart` is called so the
   * consumer can begin actual playback.
   *
   * Playback begins once the visible scene's encoder is ready.
   */
  const beginRecording = useCallback(async (onPlaybackStart: () => void) => {
    const id = ++attempt.current
    recorderDiscard()
    setRecordingError(null)
    onPlaybackStartRef.current = onPlaybackStart
    // Show the loading state before starting either preview or background work.
    flushSync(() => {
      useReplayStore.getState().setRecordingActive(true)
      setIntroVisible(true)
    })
    const result = await startRecording(cropRef?.current, preparation.current ?? Promise.reject(new Error('map-unavailable')))
    if (id !== attempt.current || (!result.ok && result.reason === 'cancelled'))
      return
    if (!result.ok) {
      setIntroVisible(false)
      useReplayStore.getState().setRecordingActive(false)
      setRecordingError(result.reason)
      onPlaybackStartRef.current = null
    }
    return result.ok
  }, [startRecording, recorderDiscard, cropRef, preparation])

  useEffect(() => {
    if (recorderError) {
      setIntroVisible(false)
      setVideoDialogOpen(false)
      onPlaybackStartRef.current = null
    }
  }, [recorderError])

  useEffect(() => () => {
    attempt.current++
  }, [])

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

  // Keep the intro opaque through camera movement and tile loading. Only a
  // painted destination may reveal the map; elapsed time is not readiness.
  useEffect(() => {
    const unsub = useReplayStore.subscribe((state, prev) => {
      if (state.earthZoomPhase === 'done' && prev.earthZoomPhase !== 'done') {
        setIntroVisible(false)
      }
      else if (state.earthZoomPhase === 'failed' && prev.earthZoomPhase !== 'failed') {
        onPlaybackStartRef.current = null
        setIntroVisible(false)
        recorderDiscard()
        setRecordingError('map-unavailable')
        state.setEarthZoomPhase('idle')
      }
    })
    return unsub
  }, [recorderDiscard])

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
      else if (state.status !== 'completed' && tid) {
        clearTimeout(tid)
        tid = null
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
    if (pendingVideo) {
      setVideoDialogOpen(true)
      return
    }
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
    attempt.current++
    setIntroVisible(false)
    onPlaybackStartRef.current = null
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
    progress,
    recordingError: recordingError ?? recorderError,
    // Actions
    beginRecording,
    showIntro,
    onIntroComplete,
    saveVideo,
    discardVideo,
    exitRecording,
    dismissRecordingError: () => {
      setRecordingError(null)
      recorderDiscard()
    },
  }
}
