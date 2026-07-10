import type { FeatureCollection } from 'geojson'
import type { RegionPhotoEntry } from '@/types/region'
import { create } from 'zustand'
import { loadBoundaryData } from '@/lib/geojson-loader'

interface RegionState {
  regionPhotos: Map<string, RegionPhotoEntry>
  boundaryData: FeatureCollection | null
  isLoading: boolean
  // Fragment mode
  isFragmentMode: boolean
  previousViewState: { longitude: number, latitude: number, zoom: number } | null

  loadBoundaries: () => Promise<void>
  assignPhotoToRegion: (
    regionId: string,
    regionName: string,
    photoId: string,
    photoUrl: string,
  ) => void
  removePhotoFromRegion: (regionId: string) => void
  clearAllRegions: () => void
  toggleFragmentMode: () => void
  setFragmentMode: (enabled: boolean) => void
  setPreviousViewState: (vs: { longitude: number, latitude: number, zoom: number } | null) => void
}

export const useRegionStore = create<RegionState>((set, get) => ({
  regionPhotos: new Map(),
  boundaryData: null,
  isLoading: false,
  isFragmentMode: false,
  previousViewState: null,

  loadBoundaries: async () => {
    if (get().boundaryData)
      return
    set({ isLoading: true })
    try {
      const data = await loadBoundaryData()
      set({ boundaryData: data, isLoading: false })
    }
    catch (error) {
      console.error('Failed to load boundary data:', error)
      set({ isLoading: false })
    }
  },

  assignPhotoToRegion: (regionId, regionName, photoId, photoUrl) => {
    set((state) => {
      const next = new Map(state.regionPhotos)
      next.set(regionId, { regionId, regionName, photoId, photoUrl })
      return { regionPhotos: next }
    })
  },

  removePhotoFromRegion: (regionId) => {
    set((state) => {
      const next = new Map(state.regionPhotos)
      next.delete(regionId)
      return { regionPhotos: next }
    })
  },

  clearAllRegions: () => {
    set({ regionPhotos: new Map() })
  },

  toggleFragmentMode: () => {
    set(state => ({ isFragmentMode: !state.isFragmentMode }))
  },

  setFragmentMode: (enabled) => {
    set({ isFragmentMode: enabled })
  },

  setPreviousViewState: (vs) => {
    set({ previousViewState: vs })
  },
}))
