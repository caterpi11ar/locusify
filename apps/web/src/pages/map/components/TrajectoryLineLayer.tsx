import type { ExpressionSpecification } from 'maplibre-gl'
import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useReplayStore } from '@/stores/replayStore'

/**
 * Renders a progressively-drawn trajectory line using pre-computed curve points.
 * Two layers on the same source:
 * 1. Glow layer (wide, blurred, low opacity) - conditional on template config
 * 2. Main progress line — with optional gradient trail when animated is true
 */
export function TrajectoryLineLayer() {
  const waypoints = useReplayStore(s => s.waypoints)
  const segments = useReplayStore(s => s.segments)
  const currentWaypointIndex = useReplayStore(s => s.currentWaypointIndex)
  const segmentProgress = useReplayStore(s => s.segmentProgress)
  const currentPosition = useReplayStore(s => s.currentPosition)
  const lineStyle = useReplayStore(s => s.templateConfig.lineStyle)

  // Progress route GeoJSON — only the traveled portion, using curve points
  const progressGeoJson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (waypoints.length < 2 || !currentPosition) {
      return { type: 'FeatureCollection', features: [] }
    }

    const coordinates: [number, number][] = []

    // Add completed segments' curve points
    for (let i = 0; i < currentWaypointIndex && i < segments.length; i++) {
      const pts = segments[i].curvePoints
      // Skip the last point of each segment (it's the first of the next)
      for (let j = 0; j < pts.length - 1; j++) {
        coordinates.push(pts[j])
      }
    }

    // Add current segment's curve points up to segmentProgress
    if (currentWaypointIndex < segments.length && segmentProgress > 0) {
      const currentSeg = segments[currentWaypointIndex]
      const pts = currentSeg.curvePoints
      if (pts.length >= 2) {
        const totalPoints = pts.length - 1
        const exactIdx = segmentProgress * totalPoints
        const endIdx = Math.floor(exactIdx)
        const frac = exactIdx - endIdx

        for (let j = 0; j <= endIdx && j < pts.length; j++) {
          coordinates.push(pts[j])
        }

        // Interpolate the partial point
        if (endIdx < totalPoints && frac > 0) {
          const p0 = pts[endIdx]
          const p1 = pts[endIdx + 1]
          coordinates.push([
            p0[0] + (p1[0] - p0[0]) * frac,
            p0[1] + (p1[1] - p0[1]) * frac,
          ])
        }
      }
    }
    else if (currentWaypointIndex < waypoints.length) {
      // At a waypoint, no partial progress — add the waypoint itself
      coordinates.push(waypoints[currentWaypointIndex].position)
    }

    // Append the exact current position as final point
    if (coordinates.length > 0) {
      coordinates.push(currentPosition)
    }

    if (coordinates.length < 2) {
      return { type: 'FeatureCollection', features: [] }
    }

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      }],
    }
  }, [waypoints, segments, currentWaypointIndex, segmentProgress, currentPosition])

  if (waypoints.length < 2)
    return null

  // Line gradient expression for animated trail effect
  const lineGradient: ExpressionSpecification | undefined = lineStyle.animated
    ? [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0,
        `${lineStyle.color}00`,
        0.4,
        `${lineStyle.color}33`,
        0.7,
        `${lineStyle.color}88`,
        0.95,
        `${lineStyle.color}dd`,
        1,
        lineStyle.color,
      ] as ExpressionSpecification
    : undefined

  return (
    <Source
      id="trajectory-progress"
      type="geojson"
      data={progressGeoJson}
      lineMetrics={lineStyle.animated}
    >
      {lineStyle.glow && (
        <Layer
          id="trajectory-glow-line"
          type="line"
          paint={{
            'line-color': lineStyle.color,
            'line-width': lineStyle.width * 3.3,
            'line-opacity': 0.15,
            'line-blur': 6,
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
        />
      )}
      <Layer
        id="trajectory-progress-line"
        type="line"
        paint={{
          ...(lineGradient
            ? { 'line-gradient': lineGradient }
            : { 'line-color': lineStyle.color }
          ),
          'line-width': lineStyle.width,
          'line-opacity': lineGradient ? 1 : 0.9,
        }}
        layout={{
          'line-join': 'round',
          'line-cap': 'round',
        }}
      />
    </Source>
  )
}
