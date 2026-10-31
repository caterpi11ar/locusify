import { NavigationControl } from 'react-map-gl/maplibre'

export { clusterMarkers } from './clustering'
export { PhotoMarkerPin } from './PhotoMarkerPin'
export { DEFAULT_MARKERS, DEFAULT_STYLE, DEFAULT_VIEW_STATE } from './types'
export { ClusterMarker } from '@/pages/map/components/ClusterMarker'
export { GeoJsonLayer } from '@/pages/map/components/GeoJsonLayer'
export function MapControls() {
  return <NavigationControl position="top-right" />
}
