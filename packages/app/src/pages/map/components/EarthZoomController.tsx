import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { computeOrbitZoom } from '@/stores/globeOrbitStore'
import { useReplayStore } from '@/stores/replayStore'

/** Duration constants (ms) */
const REVEAL_DELAY = 300
const FLY_DURATION = 2700
const INTRO_HOLD_MS = 2800 // setup → revealing wait (fade-in 700ms + hold ~2100ms)

/**
 * Renderless component that drives the cinematic earth zoom-in camera animation.
 *
 * Single continuous zoom (一镜到底):
 *   setup → revealing (300ms) → flying (2.7s single flyTo from space to target) → done
 *
 * The globe→mercator projection switch happens at the end of flyTo when the
 * zoom is high enough that the visual difference is imperceptible.
 */
export function EarthZoomController() {
  const { current: map } = useMap()
  const phaseRef = useRef(useReplayStore.getState().earthZoomPhase)

  useEffect(() => {
    if (!map)
      return

    const mapInstance = map.getMap()
    const timers: ReturnType<typeof setTimeout>[] = []

    function safeTimeout(fn: () => void, ms: number) {
      const id = setTimeout(fn, ms)
      timers.push(id)
      return id
    }

    function handlePhase(phase: ReturnType<typeof useReplayStore.getState>['earthZoomPhase']) {
      phaseRef.current = phase
      const state = useReplayStore.getState()

      if (phase === 'setup') {
        const { waypoints } = state
        if (waypoints.length < 2)
          return

        const firstPos = waypoints[0].position

        // Behind the intro overlay: switch to globe + transparent bg + jump to space
        mapInstance.setProjection({ type: 'globe' })
        mapInstance.setSky({ 'atmosphere-blend': 0 })
        const canvas = mapInstance.getCanvas()
        const container = mapInstance.getContainer()
        canvas.style.background = 'transparent'
        container.style.background = 'transparent'

        mapInstance.jumpTo({ center: firstPos, zoom: computeOrbitZoom() })

        safeTimeout(() => {
          if (phaseRef.current !== 'setup')
            return
          useReplayStore.getState().setEarthZoomPhase('revealing')
        }, INTRO_HOLD_MS)
      }

      if (phase === 'revealing') {
        const { waypoints } = state
        if (waypoints.length < 2)
          return
        const firstPos = waypoints[0].position

        let minLng = Infinity
        let maxLng = -Infinity
        let minLat = Infinity
        let maxLat = -Infinity
        for (const wp of waypoints) {
          const [lng, lat] = wp.position
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }

        const cam = mapInstance.cameraForBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 80, maxZoom: 17 },
        )
        const landZoom = cam?.zoom ?? 10

        safeTimeout(() => {
          if (phaseRef.current !== 'revealing')
            return

          useReplayStore.getState().setEarthZoomPhase('flying')
          mapInstance.flyTo({
            center: firstPos,
            zoom: landZoom,
            duration: FLY_DURATION,
            easing: (t: number) => 1 - (1 - t) ** 3,
          })
        }, REVEAL_DELAY)
      }

      if (phase === 'flying') {
        safeTimeout(() => {
          if (phaseRef.current !== 'flying')
            return

          mapInstance.setProjection({ type: 'mercator' })
          mapInstance.setSky({ 'atmosphere-blend': 0 })
          const canvas = mapInstance.getCanvas()
          const container = mapInstance.getContainer()
          canvas.style.background = ''
          container.style.background = ''

          useReplayStore.getState().setEarthZoomPhase('done')
        }, FLY_DURATION + 50)
      }

      if (phase === 'done') {
        const current = useReplayStore.getState()
        if (current.status === 'paused')
          current.togglePlayPause()
      }
    }

    const unsub = useReplayStore.subscribe((state, prev) => {
      if (state.earthZoomPhase !== prev.earthZoomPhase)
        handlePhase(state.earthZoomPhase)
    })

    // The controller can mount after startEarthZoom() changed the phase. Process
    // the current phase once so the setup transition cannot be missed.
    const initialPhase = useReplayStore.getState().earthZoomPhase
    if (initialPhase !== 'idle' && initialPhase !== 'done')
      handlePhase(initialPhase)

    return () => {
      unsub()
      for (const id of timers) clearTimeout(id)
    }
  }, [map])

  return null
}
