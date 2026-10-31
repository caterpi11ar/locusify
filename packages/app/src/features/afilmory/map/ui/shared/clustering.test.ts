import type { PhotoMarker } from '@/types/map'
import assert from 'node:assert/strict'

import { it } from 'vitest'

import { clusterMarkers } from './clustering'

function createMarker(id: string, longitude: number, latitude: number): PhotoMarker {
  return {
    id,
    longitude,
    latitude,
    photo: {
      id,
      title: id,
      dateTaken: '2026-01-01T00:00:00.000Z',
      description: '',
      tags: [],
      originalUrl: `/photos/${id}.jpg`,
      thumbnailUrl: `/thumbs/${id}.jpg`,
      thumbHash: null,
      width: 1000,
      height: 750,
      aspectRatio: 4 / 3,
      s3Key: `${id}.jpg`,
      lastModified: '2026-01-01T00:00:00.000Z',
      size: 100,
      exif: null,
      toneAnalysis: null,
    },
  }
}

it('clusterMarkers keeps the selected marker independent so its active card remains map anchored while zooming out', () => {
  const selected = createMarker('selected', 121.5001, 31.2001)
  const neighborA = createMarker('neighbor-a', 121.5002, 31.2002)
  const neighborB = createMarker('neighbor-b', 121.5003, 31.2003)
  const distant = createMarker('distant', 122.5, 32.2)

  const clusters = clusterMarkers([neighborA, selected, neighborB, distant], 10, { selectedMarkerId: selected.id })

  assert.equal(clusters.length, 3)
  assert.ok(clusters.some(clusterPoint => clusterPoint.properties.marker?.id === selected.id))
  assert.ok(
    clusters.some(clusterPoint => clusterPoint.properties.cluster && clusterPoint.properties.point_count === 2),
  )
})
