import type { ReplayState } from './types'
import AudioManager from '@/lib/audio/AudioManager'

let rafId = 0
let lastTime = 0
let managed = 0

/** The visible scene owns playback while it is mounted; never run two clocks. */
export function claimReplayClock() {
  managed++
  stopLoop()
  return () => {
    managed--
  }
}

function startLoop(getState: () => ReplayState) {
  if (managed)
    return
  lastTime = 0
  const animate = (time: number) => {
    if (lastTime === 0) {
      lastTime = time
      rafId = requestAnimationFrame(animate)
      return
    }
    const delta = time - lastTime
    lastTime = time
    if (delta > 0)
      getState()._tick(delta)
    rafId = requestAnimationFrame(animate)
  }
  rafId = requestAnimationFrame(animate)
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

export function setupReplayLoop(
  subscribe: (listener: (state: ReplayState, prevState: ReplayState) => void) => () => void,
  getState: () => ReplayState,
) {
  const handleVisibility = () => {
    if (document.hidden) {
      stopLoop()
    }
    else if (getState().status === 'playing') {
      startLoop(getState)
    }
  }
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', handleVisibility)
  const unsubscribe = subscribe((state, prevState) => {
    if (state.status === 'playing' && prevState.status !== 'playing') {
      startLoop(getState)
    }
    else if (state.status !== 'playing' && prevState.status === 'playing') {
      stopLoop()
    }

    if (state.status !== prevState.status && (!managed || !state.recordingActive)) {
      AudioManager.getInstance().syncWithReplayStatus(state.status)
    }
  })
  return () => {
    unsubscribe()
    stopLoop()
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', handleVisibility)
  }
}
