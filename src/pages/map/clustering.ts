import type { PhotoMarker } from '@/types/map'
import type { NearbyUser } from '@/types/presence'

export interface UserClusterPoint {
  user: NearbyUser
  clusteredUsers?: NearbyUser[]
  coordinates: [number, number]
}

export interface ClusterPoint {
  type: 'Feature'
  properties: {
    cluster?: boolean
    cluster_id?: number
    point_count?: number
    point_count_abbreviated?: string
    marker?: PhotoMarker
    clusteredPhotos?: PhotoMarker[]
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export function clusterNearbyUsers(users: NearbyUser[], zoom: number): UserClusterPoint[] {
  if (users.length === 0)
    return []

  if (zoom >= 15) {
    return users.map(u => ({
      user: u,
      coordinates: [u.longitude, u.latitude] as [number, number],
    }))
  }

  const result: UserClusterPoint[] = []
  const processed = new Set<string>()
  const threshold = Math.max(0.001, 0.01 / 2 ** (zoom - 10))

  for (const user of users) {
    if (processed.has(user.userId))
      continue

    const group = [user]
    processed.add(user.userId)

    for (const other of users) {
      if (processed.has(other.userId))
        continue

      const dist = Math.sqrt(
        (user.longitude - other.longitude) ** 2
        + (user.latitude - other.latitude) ** 2,
      )
      if (dist < threshold) {
        group.push(other)
        processed.add(other.userId)
      }
    }

    const lng = group.reduce((s, u) => s + u.longitude, 0) / group.length
    const lat = group.reduce((s, u) => s + u.latitude, 0) / group.length

    result.push({
      user: group[0],
      clusteredUsers: group.length > 1 ? group : undefined,
      coordinates: [lng, lat],
    })
  }

  return result
}

export function clusterMarkers(markers: PhotoMarker[], zoom: number): ClusterPoint[] {
  if (markers.length === 0)
    return []

  if (zoom >= 15) {
    return markers.map(marker => ({
      type: 'Feature' as const,
      properties: { marker },
      geometry: {
        type: 'Point' as const,
        coordinates: [marker.longitude, marker.latitude],
      },
    }))
  }

  const clusters: ClusterPoint[] = []
  const processed = new Set<string>()
  const threshold = Math.max(0.001, 0.01 / 2 ** (zoom - 10))

  for (const marker of markers) {
    if (processed.has(marker.id))
      continue

    const nearby = [marker]
    processed.add(marker.id)

    for (const other of markers) {
      if (processed.has(other.id))
        continue

      const distance = Math.sqrt(
        (marker.longitude - other.longitude) ** 2
        + (marker.latitude - other.latitude) ** 2,
      )

      if (distance < threshold) {
        nearby.push(other)
        processed.add(other.id)
      }
    }

    if (nearby.length === 1) {
      clusters.push({
        type: 'Feature',
        properties: { marker },
        geometry: {
          type: 'Point',
          coordinates: [marker.longitude, marker.latitude],
        },
      })
    }
    else {
      const centerLng = nearby.reduce((sum, m) => sum + m.longitude, 0) / nearby.length
      const centerLat = nearby.reduce((sum, m) => sum + m.latitude, 0) / nearby.length

      clusters.push({
        type: 'Feature',
        properties: {
          cluster: true,
          point_count: nearby.length,
          point_count_abbreviated: nearby.length.toString(),
          marker: nearby[0],
          clusteredPhotos: nearby,
        },
        geometry: {
          type: 'Point',
          coordinates: [centerLng, centerLat],
        },
      })
    }
  }

  return clusters
}
