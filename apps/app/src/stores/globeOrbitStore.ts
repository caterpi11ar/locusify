import { create } from 'zustand'

/** Wrap longitude to [-180, 180] */
function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

/**
 * Compute a zoom level that shows the full globe in MapLibre globe projection.
 * Uses the smaller viewport dimension and linearly interpolates so the globe
 * fits completely on any screen — including iPhone SE (375×667) in portrait.
 */
export function computeOrbitZoom(): number {
  const minDim = Math.min(window.innerWidth, window.innerHeight)
  // Empirical bounds for MapLibre globe projection:
  //   350px → zoom 1.0  (iPhone SE portrait, width = 375)
  //   1000px → zoom 2.2 (desktop)
  const MIN_DIM = 350
  const MAX_DIM = 1000
  const MIN_ZOOM = 1.0
  const MAX_ZOOM = 2.2
  const zoom = MIN_ZOOM + ((minDim - MIN_DIM) / (MAX_DIM - MIN_DIM)) * (MAX_ZOOM - MIN_ZOOM)
  return Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) * 100) / 100
}

interface GlobeOrbitState {
  isOrbiting: boolean
  status: 'idle' | 'zooming' | 'playing' | 'paused' | 'completed'
  progress: number
  startLongitude: number
  currentLongitude: number
  latitude: number
  zoom: number
  duration: number

  startOrbit: (longitude: number, latitude: number) => void
  /** Called by the controller once the initial flyTo finishes */
  onZoomReady: () => void
  togglePlayPause: () => void
  exitOrbit: () => void
  _tick: (delta: number) => void
}

export const useGlobeOrbitStore = create<GlobeOrbitState>((set, get) => ({
  isOrbiting: false,
  status: 'idle',
  progress: 0,
  startLongitude: 0,
  currentLongitude: 0,
  latitude: 20,
  zoom: computeOrbitZoom(),
  duration: 15000,

  startOrbit: (longitude, latitude) => {
    const zoom = computeOrbitZoom()
    set({
      isOrbiting: true,
      status: 'zooming',
      progress: 0,
      startLongitude: longitude,
      currentLongitude: longitude,
      latitude,
      zoom,
      duration: 15000,
    })
  },

  onZoomReady: () => {
    const { status } = get()
    if (status === 'zooming') {
      set({ status: 'paused' })
    }
  },

  togglePlayPause: () => {
    const { status } = get()
    if (status === 'playing') {
      set({ status: 'paused' })
    }
    else if (status === 'paused') {
      set({ status: 'playing' })
    }
  },

  exitOrbit: () => {
    set({
      isOrbiting: false,
      status: 'idle',
      progress: 0,
      currentLongitude: 0,
    })
  },

  _tick: (delta) => {
    const state = get()
    if (state.status !== 'playing')
      return

    const cappedDelta = Math.min(delta, 200)
    const newProgress = state.progress + cappedDelta / state.duration

    if (newProgress >= 1) {
      set({
        status: 'completed',
        progress: 1,
        currentLongitude: wrapLng(state.startLongitude + 360),
      })
      return
    }

    set({
      progress: newProgress,
      currentLongitude: wrapLng(state.startLongitude + newProgress * 360),
    })
  },
}))

// --- rAF loop managed outside React ---
let rafId = 0
let lastTime = 0

function startLoop() {
  lastTime = 0
  const animate = (time: number) => {
    if (lastTime === 0) {
      lastTime = time
      rafId = requestAnimationFrame(animate)
      return
    }
    const delta = time - lastTime
    lastTime = time
    useGlobeOrbitStore.getState()._tick(delta)
    rafId = requestAnimationFrame(animate)
  }
  rafId = requestAnimationFrame(animate)
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

// Auto-start/stop the rAF loop when status changes
useGlobeOrbitStore.subscribe((state, prevState) => {
  if (state.status === 'playing' && prevState.status !== 'playing') {
    startLoop()
  }
  else if (state.status !== 'playing' && prevState.status === 'playing') {
    stopLoop()
  }
})
