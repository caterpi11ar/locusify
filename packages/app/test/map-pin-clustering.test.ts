import type { PhotoMarker } from '@/types/map'
import { describe, expect, it } from 'vitest'
import { clusterMarkers } from '../src/pages/map/clustering'

function marker(id: string, longitude: number, latitude = 0): PhotoMarker {
  return {
    id, longitude, latitude,
    photo: {
      id, title: id, dateTaken: '', description: '', tags: [], originalUrl: '', thumbnailUrl: '',
      thumbHash: null, width: 100, height: 100, aspectRatio: 1, s3Key: '', lastModified: '',
      size: 0, exif: null, toneAnalysis: null,
    },
  }
}

describe('original map pin grouping', () => {
  it('uses the original geographic threshold as zoom changes', () => {
    const photos = [marker('a', 0), marker('b', 0.005)]
    expect(clusterMarkers(photos, 10)[0].properties.point_count).toBe(2)
    expect(clusterMarkers(photos, 14)).toHaveLength(2)
  })
  it('splits even identical locations at zoom 15 as before', () => {
    const photos = [marker('a', 1), marker('b', 1)]
    expect(clusterMarkers(photos, 14)[0].properties.point_count).toBe(2)
    expect(clusterMarkers(photos, 15)).toHaveLength(2)
  })
  it('does not merge locations outside the original threshold', () => {
    expect(clusterMarkers([marker('a', 0), marker('b', 0.02)], 10)).toHaveLength(2)
  })
})
