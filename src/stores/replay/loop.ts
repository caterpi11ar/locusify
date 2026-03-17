import AudioManager from '@/lib/audio/AudioManager'
import type { ReplayState } from './types'

let rafId = 0
let lastTime = 0

function startLoop(getState: () => ReplayState) {
  lastTime = 0
  const animate = (time: number) => {
    if (lastTime === 0) {
      lastTime = time
      rafId = requestAnimationFrame(animate)
      return
    }
    const delta = time - lastTime
    lastTime = time
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
  return subscribe((state, prevState) => {
    if (state.status === 'playing' && prevState.status !== 'playing') {
      startLoop(getState)
    }
    else if (state.status !== 'playing' && prevState.status === 'playing') {
      stopLoop()
    }

    if (state.status !== prevState.status) {
      AudioManager.getInstance().syncWithReplayStatus(state.status)
    }
  })
}
