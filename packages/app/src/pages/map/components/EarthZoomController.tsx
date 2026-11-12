import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { getReplayLandingZoom, waitForMapReady } from '@/lib/replay/map-ready'
import { computeOrbitZoom } from '@/stores/globeOrbitStore'
import { useReplayStore } from '@/stores/replayStore'

/** Prepare the camera behind the intro, revealing only a fully painted view. */
export function EarthZoomController() {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map)
      return
    const instance = map.getMap()
    let controller: AbortController | undefined

    const cancel = () => {
      controller?.abort()
      if (controller)
        instance.stop()
    }
    const run = async (signal: AbortSignal) => {
      const { waypoints } = useReplayStore.getState()
      if (waypoints.length < 2)
        return
      await waitForMapReady(instance, signal)
      instance.setProjection({ type: 'globe' })
      instance.setSky({ 'atmosphere-blend': 0 })
      instance.getCanvas().style.background = 'transparent'
      instance.getContainer().style.background = 'transparent'
      instance.jumpTo({ center: waypoints[0].position, zoom: computeOrbitZoom() })
      await waitForMapReady(instance, signal)
      signal.throwIfAborted()
      useReplayStore.getState().setEarthZoomPhase('flying')
      instance.flyTo({ center: waypoints[0].position, zoom: getReplayLandingZoom(instance, waypoints), duration: 2700, essential: true })
      await waitForMapReady(instance, signal)
      instance.setProjection({ type: 'mercator' })
      instance.setSky({ 'atmosphere-blend': 0 })
      instance.getCanvas().style.background = ''
      instance.getContainer().style.background = ''
      await waitForMapReady(instance, signal)
      signal.throwIfAborted()
      useReplayStore.getState().setEarthZoomPhase('done')
      // Playback starts from the intro's exit callback, after the fade completes.
    }
    const handlePhase = (phase: ReturnType<typeof useReplayStore.getState>['earthZoomPhase']) => {
      if (phase === 'setup') {
        cancel()
        controller = new AbortController()
        const { signal } = controller
        void run(signal).catch((cause) => {
          if (!signal.aborted) {
            console.error('[recording] Map preparation failed', cause)
            useReplayStore.getState().setEarthZoomPhase('failed')
          }
        })
      }
      else if (phase === 'idle' || phase === 'failed') {
        cancel()
      }
    }
    const unsubscribe = useReplayStore.subscribe((state, previous) => {
      if (state.earthZoomPhase !== previous.earthZoomPhase)
        handlePhase(state.earthZoomPhase)
    })
    handlePhase(useReplayStore.getState().earthZoomPhase)
    return () => {
      unsubscribe()
      cancel()
    }
  }, [map])

  return null
}
