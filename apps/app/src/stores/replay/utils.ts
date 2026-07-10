import type { ReplayWaypoint } from './types'
import type { PhotoMarker } from '@/types/map'
import type { SegmentMeta, TransportMode } from '@/types/replay'
import { haversineDistance } from '@/lib/geo'
import { interpolateSegment } from '@/lib/replay/curves'

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

export function markersToWaypoints(markers: PhotoMarker[]): ReplayWaypoint[] {
  return markers
    .filter(m => m.photo.dateTaken)
    .sort((a, b) => new Date(a.photo.dateTaken).getTime() - new Date(b.photo.dateTaken).getTime())
    .map((marker, index) => ({
      id: marker.id,
      position: [marker.longitude, marker.latitude] as [number, number],
      marker,
      timestamp: new Date(marker.photo.dateTaken),
      index,
    }))
}

export function computePosition(
  waypoints: ReplayWaypoint[],
  waypointIndex: number,
  segmentProgress: number,
  segments: SegmentMeta[],
): [number, number] | null {
  if (waypoints.length === 0)
    return null
  if (waypointIndex >= waypoints.length - 1) {
    return waypoints[waypoints.length - 1].position
  }

  const seg = segments[waypointIndex]
  const t = easeInOut(Math.max(0, Math.min(1, segmentProgress)))

  if (seg?.curvePoints && seg.curvePoints.length >= 2) {
    const totalPoints = seg.curvePoints.length - 1
    const exactIdx = t * totalPoints
    const idx = Math.floor(exactIdx)
    const frac = exactIdx - idx

    if (idx >= totalPoints) {
      return seg.curvePoints[totalPoints]
    }

    const p0 = seg.curvePoints[idx]
    const p1 = seg.curvePoints[idx + 1]
    return [
      p0[0] + (p1[0] - p0[0]) * frac,
      p0[1] + (p1[1] - p0[1]) * frac,
    ]
  }

  const from = waypoints[waypointIndex].position
  const to = waypoints[waypointIndex + 1].position
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ]
}

export function computeSegments(waypoints: ReplayWaypoint[]): SegmentMeta[] {
  const segments: SegmentMeta[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]
    const distanceKm = haversineDistance(from.position, to.position)
    const timeDeltaMs = to.timestamp.getTime() - from.timestamp.getTime()
    const mode: TransportMode = 'walking'
    const curvePoints = interpolateSegment(from.position, to.position, distanceKm, mode, i)
    segments.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm,
      timeDeltaMs,
      mode,
      curvePoints,
      isLongJump: distanceKm > 200,
    })
  }
  return segments
}

export function computeSegmentsWithPreservedModes(
  oldWaypoints: ReplayWaypoint[],
  oldSegments: SegmentMeta[],
  newWaypoints: ReplayWaypoint[],
): SegmentMeta[] {
  const oldModeMap = new Map<string, TransportMode>()
  for (const seg of oldSegments) {
    const fromId = oldWaypoints[seg.fromIndex]?.id
    const toId = oldWaypoints[seg.toIndex]?.id
    if (fromId && toId)
      oldModeMap.set(`${fromId}-${toId}`, seg.mode)
  }

  const segments: SegmentMeta[] = []
  for (let i = 0; i < newWaypoints.length - 1; i++) {
    const from = newWaypoints[i]
    const to = newWaypoints[i + 1]
    const distanceKm = haversineDistance(from.position, to.position)
    const timeDeltaMs = to.timestamp.getTime() - from.timestamp.getTime()
    const mode: TransportMode = oldModeMap.get(`${from.id}-${to.id}`) ?? 'walking'
    const curvePoints = interpolateSegment(from.position, to.position, distanceKm, mode, i)
    segments.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm,
      timeDeltaMs,
      mode,
      curvePoints,
      isLongJump: distanceKm > 200,
    })
  }

  return segments
}
