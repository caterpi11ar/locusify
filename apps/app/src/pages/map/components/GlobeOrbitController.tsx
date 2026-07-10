import { useEffect } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'

/**
 * Pure logic component: drives globe rotation by subscribing to
 * globeOrbitStore and calling map.jumpTo on each longitude change.
 *
 * On orbit start, first flies to the computed orbit zoom so the full
 * globe is visible, then begins the rotation loop.
 */
export function GlobeOrbitController() {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map)
      return

    const onMoveEnd = () => {
      const { status } = useGlobeOrbitStore.getState()
      if (status === 'zooming') {
        useGlobeOrbitStore.getState().onZoomReady()
      }
    }

    map.on('moveend', onMoveEnd)

    // Component mounts after isOrbiting becomes true, so the store
    // may already be in 'zooming' state. Handle this initial state.
    const initial = useGlobeOrbitStore.getState()
    if (initial.status === 'zooming') {
      map.flyTo({
        center: [initial.currentLongitude, initial.latitude],
        zoom: initial.zoom,
        duration: 1200,
      })
    }

    const unsub = useGlobeOrbitStore.subscribe((state) => {
      if (state.status === 'idle')
        return

      // During rotation: track longitude every frame
      if (state.status === 'playing' || state.status === 'completed') {
        map.jumpTo({
          center: [state.currentLongitude, state.latitude],
        })
      }
    })

    return () => {
      map.off('moveend', onMoveEnd)
      unsub()
    }
  }, [map])

  return null
}
