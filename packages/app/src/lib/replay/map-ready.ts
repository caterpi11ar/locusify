import type { Map } from 'maplibre-gl'
import type { ReplayWaypoint } from '@/stores/replay/types'

export function getReplayLandingZoom(map: Map, waypoints: ReplayWaypoint[]) {
  const lngs = waypoints.map(wp => wp.position[0])
  const lats = waypoints.map(wp => wp.position[1])
  return map.cameraForBounds(
    [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
    { padding: 80, maxZoom: 17 },
  )?.zoom ?? 10
}

/** Wait for a painted, stationary view; a timer must never stand in for readiness. */
export function waitForMapReady(map: Map, signal: AbortSignal, timeoutMs = 45000): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    function cleanup() {
      clearTimeout(timer)
      map.off('idle', check)
      map.off('render', check)
      map.off('remove', removed)
      signal.removeEventListener('abort', aborted)
    }
    function finish(error?: Error) {
      cleanup()
      if (error)
        reject(error)
      else
        resolve()
    }
    function check() {
      // Offline rendering advances camera time one frame at a time. The
      // deadline bounds missing tiles once stationary, not encoding wall time.
      if (map.isMoving()) {
        clearTimeout(timer)
        timer = undefined
      }
      else if (!timer) {
        timer = setTimeout(() => finish(new Error('map-unavailable')), timeoutMs)
      }
      if (map.loaded() && map.areTilesLoaded() && !map.isMoving())
        finish()
    }
    function aborted() {
      finish(new DOMException('Replay preparation cancelled', 'AbortError'))
    }
    function removed() {
      finish(new Error('map-unavailable'))
    }
    map.on('idle', check)
    map.on('render', check)
    map.on('remove', removed)
    signal.addEventListener('abort', aborted, { once: true })
    if (signal.aborted) {
      aborted()
    }
    else {
      check()
      map.triggerRepaint()
    }
  })
}

/** Camera motion can continue, but do not export a frame with missing tiles. */
export function waitForReplayTiles(map: Map, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  if (map.areTilesLoaded())
    return Promise.resolve()
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => finish(new Error('map-unavailable')), 45000)
    const check = () => {
      if (map.areTilesLoaded())
        finish()
    }
    const aborted = () => finish(signal.reason)
    const removed = () => finish(new Error('map-unavailable'))
    function finish(error?: unknown) {
      clearTimeout(deadline)
      map.off('sourcedata', check)
      map.off('render', check)
      map.off('remove', removed)
      signal.removeEventListener('abort', aborted)
      if (error)
        reject(error)
      else
        resolve()
    }
    map.on('sourcedata', check)
    map.on('render', check)
    map.on('remove', removed)
    signal.addEventListener('abort', aborted, { once: true })
    check()
  })
}
