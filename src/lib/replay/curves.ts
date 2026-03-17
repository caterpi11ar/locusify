import type { TransportMode } from '@/types/replay'

/**
 * Interpolate a great circle arc (SLERP on unit sphere) between two [lng, lat] points.
 * Used for flight arcs to show the actual curved path on the globe.
 */
export function interpolateGreatCircle(
  from: [number, number],
  to: [number, number],
  numPoints: number,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI

  const lat1 = toRad(from[1])
  const lng1 = toRad(from[0])
  const lat2 = toRad(to[1])
  const lng2 = toRad(to[0])

  // Convert to Cartesian
  const x1 = Math.cos(lat1) * Math.cos(lng1)
  const y1 = Math.cos(lat1) * Math.sin(lng1)
  const z1 = Math.sin(lat1)
  const x2 = Math.cos(lat2) * Math.cos(lng2)
  const y2 = Math.cos(lat2) * Math.sin(lng2)
  const z2 = Math.sin(lat2)

  // Angular distance
  const dot = x1 * x2 + y1 * y2 + z1 * z2
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)))

  // If points are nearly identical, return straight line
  if (omega < 1e-6) {
    return [from, to]
  }

  const sinOmega = Math.sin(omega)
  const points: [number, number][] = []

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const a = Math.sin((1 - t) * omega) / sinOmega
    const b = Math.sin(t * omega) / sinOmega

    const x = a * x1 + b * x2
    const y = a * y1 + b * y2
    const z = a * z1 + b * z2

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lng = Math.atan2(y, x)

    points.push([toDeg(lng), toDeg(lat)])
  }

  return points
}

/**
 * Cubic Bezier curve between two points with perpendicular control points.
 * Creates gentle curves for ground transport segments.
 * segmentIndex is used to alternate the curve direction.
 */
export function interpolateBezierCurve(
  from: [number, number],
  to: [number, number],
  numPoints: number,
  segmentIndex: number,
): [number, number][] {
  const midLng = (from[0] + to[0]) / 2
  const midLat = (from[1] + to[1]) / 2

  // Perpendicular offset — alternating sides based on segment index
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1e-8)
    return [from, to]

  // Offset magnitude: ~15% of the segment length, alternating direction
  const sign = segmentIndex % 2 === 0 ? 1 : -1
  const offset = len * 0.15 * sign

  // Perpendicular direction: rotate (dx, dy) by 90°
  const perpLng = (-dy / len) * offset
  const perpLat = (dx / len) * offset

  // Control points for cubic Bezier
  const cp1: [number, number] = [midLng + perpLng * 0.8, midLat + perpLat * 0.8]
  const cp2: [number, number] = [midLng + perpLng * 1.2, midLat + perpLat * 1.2]

  const points: [number, number][] = []
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const u = 1 - t
    // Cubic Bezier: B(t) = (1-t)^3*P0 + 3*(1-t)^2*t*CP1 + 3*(1-t)*t^2*CP2 + t^3*P1
    const lng = u * u * u * from[0] + 3 * u * u * t * cp1[0] + 3 * u * t * t * cp2[0] + t * t * t * to[0]
    const lat = u * u * u * from[1] + 3 * u * u * t * cp1[1] + 3 * u * t * t * cp2[1] + t * t * t * to[1]
    points.push([lng, lat])
  }

  return points
}

/**
 * Dispatch to the appropriate interpolation method based on distance and transport mode.
 * - Flights >100km → great circle arc
 * - Short distances <0.5km → straight line
 * - Otherwise → bezier curve
 */
export function interpolateSegment(
  from: [number, number],
  to: [number, number],
  distanceKm: number,
  mode: TransportMode,
  segmentIndex: number,
): [number, number][] {
  // Short segments: 10-point linear interpolation for smooth bearing sampling
  if (distanceKm < 0.5) {
    const numPts = 10
    const points: [number, number][] = []
    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts
      points.push([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ])
    }
    return points
  }

  // Number of interpolation points scales with distance
  const numPoints = Math.max(20, Math.min(100, Math.round(distanceKm / 2)))

  // Flights over 100km: great circle arc
  if (mode === 'flying' && distanceKm > 100) {
    return interpolateGreatCircle(from, to, numPoints)
  }

  // Ground transport: bezier curve
  return interpolateBezierCurve(from, to, numPoints, segmentIndex)
}
