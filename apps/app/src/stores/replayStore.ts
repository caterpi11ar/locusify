import type { EarthZoomPhase, ReplayState } from './replay/types'
import type { ReplayTemplateConfig } from '@/types/template'
import { create } from 'zustand'
import AudioManager from '@/lib/audio/AudioManager'
import { interpolateSegment } from '@/lib/replay/curves'
import { BASE_SEGMENT_DURATION, DEFAULT_TEMPLATE_ID, DWELL_DURATION, getDefaultTemplateConfig } from './replay/constants'
import { setupReplayLoop } from './replay/loop'
import { computePosition, computeSegments, computeSegmentsWithPreservedModes, markersToWaypoints } from './replay/utils'

export type { EarthZoomPhase }

export const useReplayStore = create<ReplayState>((set, get) => ({
  isReplayMode: false,
  waypoints: [],
  status: 'idle',
  currentWaypointIndex: 0,
  segmentProgress: 0,
  totalProgress: 0,
  speedMultiplier: 1,
  currentPosition: null,
  segments: [],
  currentSegmentMode: 'walking',
  recordingActive: false,
  templateId: DEFAULT_TEMPLATE_ID,
  templateConfig: getDefaultTemplateConfig(),
  customOverrides: {},
  captions: [],
  earthZoomPhase: 'idle',
  dwellRemaining: 0,

  setRecordingActive: active => set({ recordingActive: active }),

  startEarthZoom: () => set({ earthZoomPhase: 'setup' }),
  setEarthZoomPhase: phase => set({ earthZoomPhase: phase }),

  setTemplate: (templateId, config) => set({ templateId, templateConfig: config, customOverrides: {} }),

  setCustomOverrides: (overrides) => {
    const { templateConfig } = get()
    set({
      customOverrides: overrides,
      templateConfig: { ...templateConfig, ...overrides } as ReplayTemplateConfig,
    })
  },

  setCaptions: captions => set({ captions }),

  startReplay: (markers, startPaused = false) => {
    const waypoints = markersToWaypoints(markers)
    if (waypoints.length < 2)
      return
    const segments = computeSegments(waypoints)
    set({
      isReplayMode: true,
      waypoints,
      segments,
      currentSegmentMode: segments[0]?.mode ?? 'walking',
      status: startPaused ? 'paused' : 'playing',
      currentWaypointIndex: 0,
      segmentProgress: 0,
      totalProgress: 0,
      speedMultiplier: get().speedMultiplier,
      currentPosition: waypoints[0].position,
      dwellRemaining: 0,
    })
  },

  prepareReplay: (markers) => {
    const waypoints = markersToWaypoints(markers)
    if (waypoints.length < 2)
      return
    const segments = computeSegments(waypoints)
    set({
      isReplayMode: true,
      waypoints,
      segments,
      currentSegmentMode: segments[0]?.mode ?? 'walking',
      status: 'configuring',
      currentWaypointIndex: 0,
      segmentProgress: 0,
      totalProgress: 0,
      speedMultiplier: get().templateConfig.defaultSpeed || get().speedMultiplier,
      currentPosition: waypoints[0].position,
      dwellRemaining: 0,
    })
  },

  confirmConfig: () => {
    const { status, templateConfig } = get()
    if (status === 'configuring') {
      // Preload audio for the selected template
      const audio = AudioManager.getInstance()
      audio.configure(templateConfig.music.volume, templateConfig.music.fadeIn, templateConfig.music.fadeOut)
      audio.loadTrack(templateConfig.music.trackId).then(() => {
        // Only transition if still in configuring/paused state (user hasn't exited)
        const current = get().status
        if (current === 'configuring' || current === 'paused') {
          set({ status: 'paused', speedMultiplier: templateConfig.defaultSpeed || 1 })
        }
      })
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

  restartReplay: () => {
    const { waypoints } = get()
    if (waypoints.length < 2)
      return
    AudioManager.getInstance().stop()
    set({
      status: 'configuring',
      currentWaypointIndex: 0,
      segmentProgress: 0,
      totalProgress: 0,
      currentPosition: waypoints[0]?.position ?? null,
      recordingActive: false,
      earthZoomPhase: 'idle',
      dwellRemaining: 0,
    })
  },

  resetReplay: () => {
    const { waypoints, speedMultiplier } = get()
    set({
      status: 'paused',
      currentWaypointIndex: 0,
      segmentProgress: 0,
      totalProgress: 0,
      speedMultiplier,
      currentPosition: waypoints[0]?.position ?? null,
      earthZoomPhase: 'idle',
      dwellRemaining: 0,
    })
  },

  exitReplay: () => {
    AudioManager.getInstance().stop()
    set({
      isReplayMode: false,
      waypoints: [],
      status: 'idle',
      currentWaypointIndex: 0,
      segmentProgress: 0,
      totalProgress: 0,
      currentPosition: null,
      segments: [],
      currentSegmentMode: 'walking',
      recordingActive: false,
      templateId: DEFAULT_TEMPLATE_ID,
      templateConfig: getDefaultTemplateConfig(),
      customOverrides: {},
      captions: [],
      earthZoomPhase: 'idle',
      dwellRemaining: 0,
    })
  },

  setSpeedMultiplier: speed => set({ speedMultiplier: speed }),

  seekToWaypoint: (index) => {
    const { waypoints, status } = get()
    const maxIndex = waypoints.length - 1
    if (maxIndex < 1)
      return
    const clampedIndex = Math.max(0, Math.min(index, maxIndex))
    const totalSegments = waypoints.length - 1
    // If seeking to the last waypoint, mark completed
    if (clampedIndex >= maxIndex) {
      set({
        currentWaypointIndex: maxIndex,
        segmentProgress: 0,
        totalProgress: 1,
        currentPosition: waypoints[maxIndex].position,
        status: 'completed',
        dwellRemaining: 0,
      })
      return
    }
    set({
      currentWaypointIndex: clampedIndex,
      segmentProgress: 0,
      totalProgress: clampedIndex / totalSegments,
      currentPosition: waypoints[clampedIndex].position,
      status: status === 'completed' ? 'paused' : status,
      dwellRemaining: 0,
    })
  },

  setSegmentMode: (segmentIndex, mode) => {
    const { segments, currentWaypointIndex, waypoints } = get()
    if (segmentIndex < 0 || segmentIndex >= segments.length)
      return
    const updated = [...segments]
    const seg = updated[segmentIndex]
    // Recompute curve points for the new mode
    const from = waypoints[seg.fromIndex].position
    const to = waypoints[seg.toIndex].position
    const curvePoints = interpolateSegment(from, to, seg.distanceKm, mode, segmentIndex)
    updated[segmentIndex] = { ...seg, mode, curvePoints }
    const patch: Partial<ReplayState> = { segments: updated }
    if (segmentIndex === currentWaypointIndex) {
      patch.currentSegmentMode = mode
    }
    set(patch as ReplayState)
  },

  refreshReplay: (markers) => {
    const { status, segments: oldSegments } = get()
    if (status !== 'configuring')
      return
    const oldWaypoints = get().waypoints
    const waypoints = markersToWaypoints(markers)
    if (waypoints.length < 2)
      return
    const segments = computeSegmentsWithPreservedModes(oldWaypoints, oldSegments, waypoints)
    set({
      waypoints,
      segments,
      currentWaypointIndex: 0,
      segmentProgress: 0,
      totalProgress: 0,
      currentPosition: waypoints[0].position,
      currentSegmentMode: segments[0]?.mode ?? 'walking',
      dwellRemaining: 0,
    })
  },

  _tick: (delta) => {
    const state = get()
    if (state.status !== 'playing')
      return

    const totalSegments = state.waypoints.length - 1
    if (totalSegments <= 0)
      return

    // Cap delta to prevent large jumps (e.g. after tab switch)
    const cappedDelta = Math.min(delta, 200)

    // --- Dwell phase: pause at waypoint before advancing ---
    if (state.dwellRemaining > 0) {
      const remaining = state.dwellRemaining - cappedDelta
      if (remaining > 0) {
        set({ dwellRemaining: remaining })
        return
      }
      // Dwell finished — advance to next segment
      const wpIdx = state.currentWaypointIndex + 1
      if (wpIdx >= totalSegments) {
        set({
          status: 'completed',
          currentWaypointIndex: totalSegments,
          segmentProgress: 0,
          totalProgress: 1,
          currentPosition: state.waypoints[totalSegments].position,
          dwellRemaining: 0,
        })
        return
      }
      set({
        dwellRemaining: 0,
        currentWaypointIndex: wpIdx,
        segmentProgress: 0,
        currentSegmentMode: state.segments[wpIdx]?.mode ?? 'walking',
      })
      return
    }

    const segmentDuration = (state.templateConfig.segmentDuration || BASE_SEGMENT_DURATION) / state.speedMultiplier
    const progressIncrement = cappedDelta / segmentDuration

    let segProg = state.segmentProgress + progressIncrement
    const wpIdx = state.currentWaypointIndex

    // Segment completed — enter dwell phase
    if (segProg >= 1) {
      // Last segment completed
      if (wpIdx >= totalSegments - 1) {
        set({
          status: 'completed',
          currentWaypointIndex: totalSegments,
          segmentProgress: 0,
          totalProgress: 1,
          currentPosition: state.waypoints[totalSegments].position,
          dwellRemaining: 0,
        })
        return
      }
      // Clamp at end and start dwelling
      set({
        segmentProgress: 1,
        totalProgress: Math.min((wpIdx + 1) / totalSegments, 1),
        currentPosition: state.waypoints[wpIdx + 1].position,
        dwellRemaining: DWELL_DURATION,
      })
      return
    }

    // Normal progress within segment
    segProg = Math.min(segProg, 0.9999)
    const totalProgress = Math.min((wpIdx + segProg) / totalSegments, 1)
    const currentPosition = computePosition(state.waypoints, wpIdx, segProg, state.segments)

    set({
      currentWaypointIndex: wpIdx,
      segmentProgress: segProg,
      totalProgress,
      currentPosition,
      currentSegmentMode: state.segments[wpIdx]?.mode ?? 'walking',
    })
  },
}))
setupReplayLoop(useReplayStore.subscribe, useReplayStore.getState)
