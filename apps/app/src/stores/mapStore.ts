import type { Map as MaplibreMap } from 'maplibre-gl'
import { create } from 'zustand'

interface MapStoreState {
  mapInstance: MaplibreMap | null
  registerMap: (map: MaplibreMap) => void
  unregisterMap: () => void
}

export const useMapStore = create<MapStoreState>(set => ({
  mapInstance: null,
  registerMap: map => set({ mapInstance: map }),
  unregisterMap: () => set({ mapInstance: null }),
}))
