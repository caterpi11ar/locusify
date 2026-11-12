import type { ReplayWaypoint } from '@/stores/replay/types'
import { Map as MapLibreMap } from 'maplibre-gl'
import logo from '@/assets/locusify.png'
import { computeOrbitZoom } from '@/stores/globeOrbitStore'
import { getReplayLandingZoom, waitForMapReady } from './map-ready'

/** Warm the globe, flight and destination while the user configures the replay. */
export async function prepareReplayAssets(map: MapLibreMap, waypoints: ReplayWaypoint[], parentSignal: AbortSignal) {
  parentSignal.throwIfAborted()
  const controller = new AbortController()
  const { signal } = controller
  const abort = () => controller.abort()
  parentSignal.addEventListener('abort', abort, { once: true })
  const container = document.createElement('div')
  container.dataset.replayPreload = 'true'
  container.setAttribute('aria-hidden', 'true')
  const { width, height } = map.getContainer().getBoundingClientRect()
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${Math.max(1, width)}px;height:${Math.max(1, height)}px;pointer-events:none`
  document.body.append(container)
  let warmMap: MapLibreMap | undefined
  try {
    await waitForMapReady(map, signal)
    signal.throwIfAborted()
    warmMap = new MapLibreMap({
      container,
      style: { ...map.getStyle(), projection: { type: 'globe' } },
      center: waypoints[0].position,
      zoom: computeOrbitZoom(),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    })
    const loadMap = async () => {
      await waitForMapReady(warmMap!, signal)
      // Render the same flight to warm intermediate zoom levels as well as
      // the destination. This map never changes the user's configuration view.
      warmMap!.flyTo({ center: waypoints[0].position, zoom: getReplayLandingZoom(map, waypoints), duration: 1000, essential: true })
      await waitForMapReady(warmMap!, signal)
    }
    const urls = [...new Set([logo, ...waypoints.map(wp => wp.marker.photo.thumbnailUrl)].filter(Boolean))]
    let next = 0
    const loadImages = async () => {
      while (next < urls.length) {
        signal.throwIfAborted()
        await decodeImage(urls[next++], signal)
      }
    }
    await Promise.all([loadMap(), document.fonts.ready, ...Array.from({ length: 3 }, loadImages)])
  }
  finally {
    controller.abort()
    parentSignal.removeEventListener('abort', abort)
    warmMap?.remove()
    container.remove()
  }
}

function decodeImage(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timer = setTimeout(() => finish(new Error('asset-unavailable')), 30000)
    function finish(error?: Error) {
      clearTimeout(timer)
      signal.removeEventListener('abort', aborted)
      if (error) {
        image.src = ''
        reject(error)
      }
      else {
        resolve()
      }
    }
    function aborted() {
      finish(new DOMException('Replay preparation cancelled', 'AbortError'))
    }
    signal.addEventListener('abort', aborted, { once: true })
    if (signal.aborted) {
      aborted()
      return
    }
    image.src = url
    void image.decode().then(() => finish(), () => finish(new Error('asset-unavailable')))
  })
}
