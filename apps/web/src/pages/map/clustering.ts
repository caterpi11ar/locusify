import type { PhotoMarker } from '@/types/map'

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
