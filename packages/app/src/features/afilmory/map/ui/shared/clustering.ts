import type { ClusterPoint } from './types'

import type { PhotoMarker } from '@/types/map'

/**
 * Simple clustering algorithm for small datasets
 * @param markers Array of photo markers to cluster
 * @param zoom Current zoom level
 * @returns Array of cluster points
 */
interface ClusterMarkersOptions {
  selectedMarkerId?: string | null
}

export function clusterMarkers(
  markers: PhotoMarker[],
  zoom: number,
  options: ClusterMarkersOptions = {},
): ClusterPoint[] {
  if (markers.length === 0) {
    return []
  }

  // At high zoom levels, don't cluster
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
  const selectedMarkerId = options.selectedMarkerId

  // Simple distance-based clustering
  const threshold = Math.max(0.001, 0.01 / 2 ** (zoom - 10)) // Adjust threshold based on zoom

  for (const marker of markers) {
    if (processed.has(marker.id)) {
      continue
    }

    if (marker.id === selectedMarkerId) {
      processed.add(marker.id)
      clusters.push({
        type: 'Feature',
        properties: { marker },
        geometry: {
          type: 'Point',
          coordinates: [marker.longitude, marker.latitude],
        },
      })
      continue
    }

    const nearby = [marker]
    processed.add(marker.id)

    // Find nearby markers
    for (const other of markers) {
      if (processed.has(other.id)) {
        continue
      }
      if (other.id === selectedMarkerId) {
        continue
      }

      const distance = Math.sqrt((marker.longitude - other.longitude) ** 2 + (marker.latitude - other.latitude) ** 2)

      if (distance < threshold) {
        nearby.push(other)
        processed.add(other.id)
      }
    }

    if (nearby.length === 1) {
      // Single marker
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
      // Cluster
      const centerLng = nearby.reduce((sum, m) => sum + m.longitude, 0) / nearby.length
      const centerLat = nearby.reduce((sum, m) => sum + m.latitude, 0) / nearby.length

      clusters.push({
        type: 'Feature',
        properties: {
          cluster: true,
          point_count: nearby.length,
          point_count_abbreviated: nearby.length.toString(),
          marker: nearby[0], // Representative marker for the cluster
          clusteredPhotos: nearby, // All photos in the cluster
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
