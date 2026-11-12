import { useEffect, useRef } from 'react'
import AudioManager from '@/lib/audio/AudioManager'
import { prepareReplayAvatar } from '@/lib/replay/prepare-avatar'
import { useAuthStore } from '@/stores/authStore'
import { useMapStore } from '@/stores/mapStore'
import { useReplayStore } from '@/stores/replayStore'
import { useSettingsStore } from '@/stores/settingsStore'

function waitForRegisteredMap(signal: AbortSignal) {
  return new Promise<NonNullable<ReturnType<typeof useMapStore.getState>['mapInstance']>>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('map-unavailable'))
    }, 45000)
    const unsubscribe = useMapStore.subscribe(check)
    function cleanup() {
      clearTimeout(timer)
      unsubscribe()
      signal.removeEventListener('abort', aborted)
    }
    function check() {
      const map = useMapStore.getState().mapInstance
      if (map) {
        cleanup()
        resolve(map)
      }
    }
    function aborted() {
      cleanup()
      reject(new DOMException('Replay preparation cancelled', 'AbortError'))
    }
    signal.addEventListener('abort', aborted, { once: true })
    if (signal.aborted)
      aborted()
    else
      check()
  })
}

export function useReplayPreparation() {
  const waypoints = useReplayStore(s => s.waypoints)
  const isReplayMode = useReplayStore(s => s.isReplayMode)
  const trackId = useReplayStore(s => s.templateConfig.music.trackId)
  const avatarUrl = useAuthStore(s => s.user?.avatarUrl ?? '')
  const avatarType = useSettingsStore(s => s.avatarSource.type)
  const preparation = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (!isReplayMode || waypoints.length < 2)
      return
    const controller = new AbortController()
    const task = Promise.all([
      Promise.all([waitForRegisteredMap(controller.signal), import('@/lib/replay/prepare-assets')])
        .then(([map, { prepareReplayAssets }]) => prepareReplayAssets(map, waypoints, controller.signal)),
      import('@/lib/replay/live-encoder'),
      AudioManager.getInstance().loadTrack(trackId),
      avatarType === 'profile' ? prepareReplayAvatar(avatarUrl) : Promise.resolve(),
    ]).then(() => {})
    // Keep the rejection for Start to report; background preparation itself
    // must not produce an unhandled rejection while the user edits settings.
    void task.catch(() => {})
    preparation.current = task
    return () => {
      controller.abort()
      if (preparation.current === task)
        preparation.current = null
    }
  }, [isReplayMode, waypoints, trackId, avatarUrl, avatarType])

  return preparation
}
