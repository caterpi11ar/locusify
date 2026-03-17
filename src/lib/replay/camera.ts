import type { TransportMode } from '@/types/replay'
import { computeBearing } from '@/lib/geo'

/** Continuous log-scale mapping from distance (km) to ideal zoom level. */
export function computeSegmentZoom(distanceKm: number): number {
  if (distanceKm <= 0)
    return 17
  const zoom = 15 - (Math.log10(distanceKm) / Math.log10(1000)) * 11
  return Math.max(4, Math.min(17, zoom))
}

/** Mode-aware pitch: flying is flatter, ground modes are steeper. */
export function computeSegmentPitch(distanceKm: number, mode: TransportMode): number {
  switch (mode) {
    case 'flying':
      // Longer flights → flatter pitch for overview; short flights still tilted
      return distanceKm > 500 ? 0 : distanceKm > 100 ? 15 : 30
    case 'driving':
    case 'train':
      return 50
    case 'walking':
    case 'cycling':
      return distanceKm > 5 ? 55 : 60
    default:
      return 45
  }
}

/** Shortest-arc bearing interpolation handling 360° wraparound. */
export function smoothBearing(current: number, target: number, t: number): number {
  let diff = target - current
  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return ((current + diff * t) % 360 + 360) % 360
}

export interface CameraTarget {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

/**
 * Compute the ideal camera target for the current replay position.
 *
 * Zoom strategy: use the median segment distance to set a stable "trip zoom"
 * anchor, then allow each segment only ±1.5 deviation. This prevents the
 * constant zoom oscillation that causes dizziness and excessive tile requests.
 */
export function computeCameraTarget(
  waypoints: { position: [number, number] }[],
  segments: { distanceKm: number, mode: TransportMode, curvePoints: [number, number][] }[],
  currentWaypointIndex: number,
  segmentProgress: number,
  currentPosition: [number, number],
): CameraTarget {
  const segIndex = Math.min(currentWaypointIndex, segments.length - 1)
  if (segIndex < 0) {
    return { center: currentPosition, zoom: 12, bearing: 0, pitch: 0 }
  }

  const seg = segments[segIndex]

  // Stable trip-level zoom from median segment distance
  const distances = segments.map(s => s.distanceKm).sort((a, b) => a - b)
  const medianDist = distances[Math.floor(distances.length / 2)]
  const tripZoom = computeSegmentZoom(medianDist)

  // Per-segment zoom clamped to ±1.5 of trip anchor — no U-shaped envelope
  const segZoom = computeSegmentZoom(seg.distanceKm)
  const zoom = tripZoom + Math.max(-1.5, Math.min(1.5, segZoom - tripZoom))

  const pitch = computeSegmentPitch(seg.distanceKm, seg.mode)

  // Compute bearing with far-distance sampling to reduce noise.
  let bearing = 0
  if (seg.curvePoints.length >= 2) {
    const totalPts = seg.curvePoints.length - 1
    const curveIdx = Math.min(
      Math.floor(segmentProgress * totalPts),
      totalPts,
    )
    // Far-distance sampling: look ahead by 10% of total points, minimum 3
    const lookAheadPts = Math.max(3, Math.round(totalPts * 0.1))
    const aheadIdx = Math.min(curveIdx + lookAheadPts, totalPts)
    if (aheadIdx > curveIdx) {
      bearing = computeBearing(seg.curvePoints[curveIdx], seg.curvePoints[aheadIdx])
    }
  }
  else {
    const from = waypoints[currentWaypointIndex]?.position
    const to = waypoints[currentWaypointIndex + 1]?.position
    if (from && to) {
      bearing = computeBearing(from, to)
    }
  }

  // Use currentPosition directly as center — no look-ahead offset
  return { center: currentPosition, zoom, bearing, pitch }
}
