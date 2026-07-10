import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { useRegionStore } from '@/stores/regionStore'

/**
 * Fragment-mode layer: highlights regions that have photos with a bright fill
 * and outline; unlit regions get a dark fog-of-war overlay.
 */
export function RegionFillLayer() {
  const regionPhotos = useRegionStore(s => s.regionPhotos)
  const boundaryData = useRegionStore(s => s.boundaryData)
  const isFragmentMode = useRegionStore(s => s.isFragmentMode)

  const annotatedData = useMemo(() => {
    if (!boundaryData)
      return null
    return {
      ...boundaryData,
      features: boundaryData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          lit: regionPhotos.has(feature.id as string) ? 'yes' : 'no',
        },
      })),
    }
  }, [boundaryData, regionPhotos])

  if (!isFragmentMode || !annotatedData)
    return null

  return (
    <Source id="region-boundaries" type="geojson" data={annotatedData}>
      {/* Lit regions: bright highlight fill */}
      <Layer
        id="region-fill-lit"
        type="fill"
        filter={['==', ['get', 'lit'], 'yes']}
        paint={{
          'fill-color': '#38bdf8',
          'fill-opacity': 0.35,
        }}
      />
      {/* Unlit regions: dark fog-of-war */}
      <Layer
        id="region-fill-unlit"
        type="fill"
        filter={['==', ['get', 'lit'], 'no']}
        paint={{
          'fill-color': '#000000',
          'fill-opacity': 0.25,
        }}
      />
      {/* Lit regions: bright outline */}
      <Layer
        id="region-outline-lit"
        type="line"
        filter={['==', ['get', 'lit'], 'yes']}
        paint={{
          'line-color': '#38bdf8',
          'line-width': 1.5,
          'line-opacity': 0.6,
        }}
      />
    </Source>
  )
}
