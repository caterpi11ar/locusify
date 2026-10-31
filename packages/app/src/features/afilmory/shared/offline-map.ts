import type { StyleSpecification } from 'maplibre-gl'

// A fixed whole-world resource, never derived from photo bounds. No glyphs, sprites or tiles.
const style: StyleSpecification = {
  version: 8,
  sources: {
    countries: { type: 'geojson', data: '/geo/ne_110m_admin_0_countries.geojson' },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#dceef5' } },
    { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': '#d5ddca' } },
    { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': '#879b8c', 'line-width': 0.5 } },
  ],
}
const darkStyle: StyleSpecification = {
  ...style,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#101820' } },
    { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': '#29352f' } },
    { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': '#596b60', 'line-width': 0.5 } },
  ],
}

export const getMapStyle = (theme?: string) => theme === 'dark' ? darkStyle : style
