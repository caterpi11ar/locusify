import type { FeatureCollection } from 'geojson'
import type { Map as MaplibreMap } from 'maplibre-gl'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point as turfPoint } from '@turf/helpers'
import { haversineDistance } from './geo'

interface CountryResult {
  id: string
  nameEn: string
  nameZh: string
}

export interface WaypointLocation {
  country: CountryResult | null
  city: string | null
}

/**
 * Resolve the country for a given [lng, lat] position using
 * NaturalEarth boundary polygons + point-in-polygon test.
 */
export function resolveCountry(
  position: [number, number],
  boundaryData: FeatureCollection,
): CountryResult | null {
  const pt = turfPoint(position)
  for (const feature of boundaryData.features) {
    try {
      if (booleanPointInPolygon(pt, feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)) {
        const props = feature.properties ?? {}
        return {
          id: (feature.id as string) ?? props.ISO_A3 ?? 'UNKNOWN',
          nameEn: props.NAME_EN ?? props.NAME ?? '',
          nameZh: props.NAME_ZH ?? props.NAME ?? '',
        }
      }
    }
    catch {
      // skip features with invalid geometry
    }
  }
  return null
}

/**
 * Resolve the nearest city/town for a given [lng, lat] position
 * by querying CARTO vector tile `place` source-layer features
 * already loaded by the MapLibre map instance.
 * Returns the city name within a 50 km threshold, or null.
 */
export function resolveCity(
  position: [number, number],
  map: MaplibreMap,
): string | null {
  try {
    const features = map.querySourceFeatures('carto', {
      sourceLayer: 'place',
      filter: ['in', 'class', 'city', 'town'],
    })

    if (features.length === 0)
      return null

    let closest: { name: string, dist: number } | null = null

    for (const f of features) {
      const geom = f.geometry
      if (geom.type !== 'Point')
        continue
      const coords = geom.coordinates as [number, number]
      const dist = haversineDistance(position, coords)
      if (dist < 50 && (!closest || dist < closest.dist)) {
        const name = f.properties?.name_en || f.properties?.name || ''
        if (name) {
          closest = { name, dist }
        }
      }
    }

    return closest?.name ?? null
  }
  catch {
    return null
  }
}

/**
 * Pre-compute country + city for every waypoint in a single pass.
 * Call once when replay starts; results are cached by the consumer.
 */
export function resolveAllWaypointLocations(
  positions: [number, number][],
  boundaryData: FeatureCollection,
  map: MaplibreMap,
): Map<number, WaypointLocation> {
  const result = new Map<number, WaypointLocation>()

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]
    result.set(i, {
      country: resolveCountry(pos, boundaryData),
      city: resolveCity(pos, map),
    })
  }

  return result
}
