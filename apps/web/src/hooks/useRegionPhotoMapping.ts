import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point as turfPoint } from '@turf/helpers'
import { useEffect, useRef } from 'react'
import { usePhotoStore } from '@/stores/photoStore'
import { useRegionStore } from '@/stores/regionStore'

/**
 * Bridge between photoStore and regionStore.
 * Automatically maps photo markers to country regions via GPS point-in-polygon,
 * and syncs deletions/clears.
 */
export function useRegionPhotoMapping() {
  const markers = usePhotoStore(s => s.markers)
  const photos = usePhotoStore(s => s.photos)
  const boundaryData = useRegionStore(s => s.boundaryData)
  const loadBoundaries = useRegionStore(s => s.loadBoundaries)

  const prevPhotoIdsRef = useRef<Set<string>>(new Set())

  // Load boundaries on mount
  useEffect(() => {
    loadBoundaries()
  }, [loadBoundaries])

  // Auto GPS matching: when markers or boundaryData change
  // Reads regionPhotos via getState() to avoid dependency-loop re-triggers
  useEffect(() => {
    if (!boundaryData || markers.length === 0)
      return

    const { regionPhotos, assignPhotoToRegion } = useRegionStore.getState()
    const pending: { regionId: string, name: string, markerId: string, photoUrl: string }[] = []

    for (const marker of markers) {
      const pt = turfPoint([marker.longitude, marker.latitude])

      for (const feature of boundaryData.features) {
        const regionId = feature.id as string
        if (regionPhotos.has(regionId))
          continue

        try {
          if (booleanPointInPolygon(pt, feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)) {
            const name = feature.properties?.NAME ?? regionId
            pending.push({ regionId, name, markerId: marker.id, photoUrl: marker.photo.thumbnailUrl })
            break
          }
        }
        catch {
          // skip features with invalid geometry
        }
      }
    }

    // Batch all assignments in one pass — no cascading re-renders
    for (const p of pending) {
      assignPhotoToRegion(p.regionId, p.name, p.markerId, p.photoUrl)
    }
  }, [markers, boundaryData])

  // Sync deletions: when photos are removed, clean up their region assignments
  useEffect(() => {
    const currentIds = new Set(photos.map(p => p.id))
    const { regionPhotos, removePhotoFromRegion, clearAllRegions } = useRegionStore.getState()

    // If all photos cleared
    if (currentIds.size === 0 && prevPhotoIdsRef.current.size > 0) {
      clearAllRegions()
      prevPhotoIdsRef.current = currentIds
      return
    }

    // Batch check for individually removed photos
    const toRemove: string[] = []
    for (const [regionId, entry] of regionPhotos) {
      if (!currentIds.has(entry.photoId)) {
        toRemove.push(regionId)
      }
    }
    for (const regionId of toRemove) {
      removePhotoFromRegion(regionId)
    }

    prevPhotoIdsRef.current = currentIds
  }, [photos])
}
