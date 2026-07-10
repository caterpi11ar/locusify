import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import { computeCameraTarget, smoothBearing } from '@/lib/replay/camera'
import { useReplayStore } from '@/stores/replayStore'

/**
 * Smart camera controller: tracks the interpolated replay position with
 * damped zoom, bearing, and pitch for a drone-flyover feel.
 *
 * On first frame, fits the map to show all waypoints. Then applies
 * smooth camera following during playback using computeCameraTarget.
 */
export function TrajectoryController() {
  const { current: map } = useMap()

  // Damped camera state persists across frames via ref
  const cameraRef = useRef({
    zoom: 12,
    bearing: 0,
    pitch: 0,
    centerLng: 0,
    centerLat: 0,
    initialised: false,
    earthZoomHandled: false,
  })

  useEffect(() => {
    if (!map)
      return

    // Set left padding so all camera ops center on the right 60% (unoccluded by photo panel)
    const mapInstance = map.getMap()
    const panelWidth = Math.round(mapInstance.getContainer().offsetWidth * 0.4)
    mapInstance.setPadding({ left: panelWidth, top: 0, right: 0, bottom: 0 })

    const cam = cameraRef.current
    cam.initialised = false
    cam.earthZoomHandled = false

    function fitToWaypoints(state: ReturnType<typeof useReplayStore.getState>) {
      const { waypoints } = state
      if (waypoints.length >= 2) {
        let minLng = Infinity
        let maxLng = -Infinity
        let minLat = Infinity
        let maxLat = -Infinity
        for (const wp of waypoints) {
          const [lng, lat] = wp.position
          if (lng < minLng)
            minLng = lng
          if (lng > maxLng)
            maxLng = lng
          if (lat < minLat)
            minLat = lat
          if (lat > maxLat)
            maxLat = lat
        }
        map!.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 80, maxZoom: 17, duration: 800 },
        )
      }
      else if (state.currentPosition) {
        map!.flyTo({ center: state.currentPosition, zoom: 14, duration: 800 })
      }
    }

    const unsub = useReplayStore.subscribe((state, prevState) => {
      const { earthZoomPhase } = state

      // Skip camera control while earth zoom is actively running
      if (earthZoomPhase !== 'idle' && earthZoomPhase !== 'done')
        return

      // When earth zoom finishes, mark that it already positioned the camera
      if (earthZoomPhase === 'done' && prevState.earthZoomPhase !== 'done') {
        cam.earthZoomHandled = true
        cam.initialised = true
        return
      }

      if (state.status === 'idle' || !state.currentPosition) {
        // Reset so the next replay gets a fresh fitBounds entrance.
        cam.initialised = false
        cam.earthZoomHandled = false
        return
      }

      // When entering configuring, fit map to show route overview
      if (state.status === 'configuring' && prevState.status !== 'configuring') {
        fitToWaypoints(state)
        return
      }

      // Skip camera movement during configuring phase —
      // let the user browse the map freely before playback starts.
      if (state.status === 'configuring')
        return

      if (!cam.initialised) {
        cam.initialised = true
        cam.centerLng = state.currentPosition[0]
        cam.centerLat = state.currentPosition[1]
        fitToWaypoints(state)
        return
      }

      // Every play click re-fits the map, same as the initial entrance.
      // Skip if EarthZoomController already handled the positioning.
      if (state.status === 'playing' && prevState.status !== 'playing') {
        if (cam.earthZoomHandled) {
          cam.earthZoomHandled = false
          return
        }
        fitToWaypoints(state)
        return
      }

      // --- Smart camera following ---
      const cameraConfig = state.templateConfig.camera
      const followMode = cameraConfig?.followMode ?? 'smart'

      if (followMode === 'fixed') {
        // Fixed mode: just track center, no zoom/bearing/pitch changes
        map.jumpTo({ center: state.currentPosition })
        return
      }

      if (followMode === 'topdown') {
        // Top-down: track center with gentle zoom, no pitch/bearing
        const damping = cameraConfig?.damping ?? 0.1
        cam.centerLng += (state.currentPosition[0] - cam.centerLng) * damping * 2
        cam.centerLat += (state.currentPosition[1] - cam.centerLat) * damping * 2
        map.jumpTo({
          center: [cam.centerLng, cam.centerLat],
          bearing: 0,
          pitch: 0,
        })
        return
      }

      // Smart mode: full camera computation
      if (state.segments.length === 0) {
        map.jumpTo({ center: state.currentPosition })
        return
      }

      const ideal = computeCameraTarget(
        state.waypoints,
        state.segments,
        state.currentWaypointIndex,
        state.segmentProgress,
        state.currentPosition,
      )

      const damping = cameraConfig?.damping ?? 0.08
      const pitchEnabled = cameraConfig?.pitchEnabled !== false
      const bearingEnabled = cameraConfig?.bearingEnabled !== false

      // Damped interpolation toward ideal camera
      // Zoom uses very low damping to prevent frequent zoom oscillation
      cam.zoom += (ideal.zoom - cam.zoom) * damping * 0.3
      if (bearingEnabled) {
        // Dead zone: ignore bearing changes < 8° to eliminate micro-jitter
        let bearingDiff = ideal.bearing - cam.bearing
        while (bearingDiff > 180) bearingDiff -= 360
        while (bearingDiff < -180) bearingDiff += 360
        if (Math.abs(bearingDiff) >= 8) {
          cam.bearing = smoothBearing(cam.bearing, ideal.bearing, damping * 0.3)
        }
      }
      else {
        cam.bearing = 0
      }
      cam.pitch = pitchEnabled
        ? cam.pitch + (ideal.pitch - cam.pitch) * damping
        : 0
      cam.centerLng += (state.currentPosition[0] - cam.centerLng) * damping * 2
      cam.centerLat += (state.currentPosition[1] - cam.centerLat) * damping * 2

      map.jumpTo({
        center: [cam.centerLng, cam.centerLat],
        zoom: cam.zoom,
        bearing: cam.bearing,
        pitch: cam.pitch,
      })
    })

    return () => {
      unsub()
      mapInstance.setPadding({ left: 0, top: 0, right: 0, bottom: 0 })
    }
  }, [map])

  return null
}
