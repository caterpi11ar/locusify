const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Haversine distance between two [lng, lat] points in km. */
export function haversineDistance(from: [number, number], to: [number, number]): number {
  const dLat = toRad(to[1] - from[1])
  const dLng = toRad(to[0] - from[0])
  const a
    = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Compute bearing (heading) in degrees from one [lng, lat] to another. */
export function computeBearing(from: [number, number], to: [number, number]): number {
  const dLng = toRad(to[0] - from[0])
  const lat1 = toRad(from[1])
  const lat2 = toRad(to[1])
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
