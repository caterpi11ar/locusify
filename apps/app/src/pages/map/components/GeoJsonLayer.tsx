import { Layer, Source } from 'react-map-gl/maplibre'

// LayerProps type definition for compatibility
export interface LayerProps {
  id: string
  type: 'fill' | 'line' | 'symbol' | 'circle' | 'raster' | 'fill-extrusion'
  paint?: Record<string, any>
  layout?: Record<string, any>
}

interface GeoJsonLayerProps {
  data: GeoJSON.FeatureCollection
  layerStyle?: LayerProps
}

const DEFAULT_LAYER_STYLE: LayerProps = {
  id: 'data',
  type: 'fill',
  paint: {
    'fill-color': '#0080ff',
    'fill-opacity': 0.5,
  },
}

export function GeoJsonLayer({
  data,
  layerStyle = DEFAULT_LAYER_STYLE,
}: GeoJsonLayerProps) {
  return (
    <Source type="geojson" data={data}>
      <Layer {...layerStyle} />
    </Source>
  )
}
