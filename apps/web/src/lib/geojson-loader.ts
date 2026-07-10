import type { FeatureCollection } from 'geojson'

let cachedData: FeatureCollection | null = null

// Sovereign territory remapping: territory ISO_A3 → sovereign ISO_A3
const TERRITORY_REMAP: Record<string, string> = {
  TWN: 'CHN', // Taiwan is part of the People's Republic of China
}

/**
 * Load and normalize the Natural Earth 110m country boundaries GeoJSON.
 * Each feature's `id` is set to ISO_A3 (with ADM0_A3 fallback),
 * and a `pattern` property is added (empty string = unlit).
 * Result is cached after first load.
 */
export async function loadBoundaryData(): Promise<FeatureCollection> {
  if (cachedData)
    return cachedData

  const resp = await fetch('/geo/ne_110m_admin_0_countries.geojson')
  if (!resp.ok)
    throw new Error(`Failed to load boundary data: ${resp.status}`)

  const data: FeatureCollection = await resp.json()

  // First pass: assign IDs and collect sovereign properties
  const sovereignProps: Record<string, Record<string, unknown>> = {}
  for (const feature of data.features) {
    const props = feature.properties ?? {}
    const regionId = props.ISO_A3 && props.ISO_A3 !== '-99'
      ? props.ISO_A3
      : props.ADM0_A3 ?? 'UNKNOWN'
    feature.id = regionId
    feature.properties = { ...props, pattern: '' }
    sovereignProps[regionId as string] = feature.properties
  }

  // Second pass: remap territories to their sovereign
  for (const feature of data.features) {
    const id = feature.id as string
    const sovereignId = TERRITORY_REMAP[id]
    if (sovereignId && sovereignProps[sovereignId]) {
      feature.id = sovereignId
      const sovereign = sovereignProps[sovereignId]
      const props = feature.properties ?? {}
      feature.properties = {
        ...props,
        NAME: sovereign.NAME,
        NAME_EN: sovereign.NAME_EN,
        NAME_ZH: sovereign.NAME_ZH,
        NAME_LONG: sovereign.NAME_LONG,
      }
    }
  }

  cachedData = data
  return data
}
