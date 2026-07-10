import type { PhotoMarker } from '@/types/map'
import { beforeEach, describe, expect, it } from 'vitest'
import { useReplayStore } from '@/stores/replayStore'

function makeMarker(id: string, lng: number, lat: number, dateTaken: string): PhotoMarker {
  return {
    id,
    longitude: lng,
    latitude: lat,
    photo: {
      id,
      title: id,
      dateTaken,
      tags: [],
      description: '',
      originalUrl: '',
      thumbnailUrl: '',
      thumbHash: null,
      width: 0,
      height: 0,
      aspectRatio: 1,
      s3Key: '',
      lastModified: dateTaken,
      size: 0,
      exif: null,
      toneAnalysis: null,
    },
  }
}

const markers: PhotoMarker[] = [
  makeMarker('a', 139.69, 35.68, '2025-01-01T10:00:00Z'),
  makeMarker('b', 135.50, 34.69, '2025-01-01T12:00:00Z'),
  makeMarker('c', 130.40, 33.59, '2025-01-01T14:00:00Z'),
]

describe('replayStore', () => {
  beforeEach(() => {
    useReplayStore.getState().exitReplay()
  })

  it('starts in idle state', () => {
    const state = useReplayStore.getState()
    expect(state.status).toBe('idle')
    expect(state.isReplayMode).toBe(false)
    expect(state.waypoints).toHaveLength(0)
  })

  it('prepareReplay sets configuring state', () => {
    useReplayStore.getState().prepareReplay(markers)
    const state = useReplayStore.getState()
    expect(state.status).toBe('configuring')
    expect(state.isReplayMode).toBe(true)
    expect(state.waypoints).toHaveLength(3)
    expect(state.segments).toHaveLength(2)
    expect(state.currentPosition).not.toBeNull()
  })

  it('prepareReplay ignores fewer than 2 markers', () => {
    useReplayStore.getState().prepareReplay([markers[0]])
    expect(useReplayStore.getState().status).toBe('idle')
  })

  it('confirmConfig transitions from configuring to paused', () => {
    useReplayStore.getState().prepareReplay(markers)
    useReplayStore.getState().confirmConfig()
    expect(useReplayStore.getState().status).toBe('paused')
  })

  it('togglePlayPause cycles between playing and paused', () => {
    useReplayStore.getState().prepareReplay(markers)
    useReplayStore.getState().confirmConfig()

    useReplayStore.getState().togglePlayPause()
    expect(useReplayStore.getState().status).toBe('playing')

    useReplayStore.getState().togglePlayPause()
    expect(useReplayStore.getState().status).toBe('paused')
  })

  it('seekToWaypoint updates position and progress', () => {
    useReplayStore.getState().prepareReplay(markers)
    useReplayStore.getState().confirmConfig()

    useReplayStore.getState().seekToWaypoint(1)
    const state = useReplayStore.getState()
    expect(state.currentWaypointIndex).toBe(1)
    expect(state.totalProgress).toBeCloseTo(0.5)
    expect(state.currentPosition).toEqual(useReplayStore.getState().waypoints[1].position)
  })

  it('seekToWaypoint to last marks completed', () => {
    useReplayStore.getState().prepareReplay(markers)
    useReplayStore.getState().confirmConfig()

    useReplayStore.getState().seekToWaypoint(2)
    expect(useReplayStore.getState().status).toBe('completed')
    expect(useReplayStore.getState().totalProgress).toBe(1)
  })

  it('_tick advances playback', () => {
    useReplayStore.getState().startReplay(markers)
    const before = useReplayStore.getState().totalProgress

    useReplayStore.getState()._tick(500)
    const after = useReplayStore.getState().totalProgress
    expect(after).toBeGreaterThan(before)
  })

  it('_tick completes replay after sufficient time', () => {
    useReplayStore.getState().startReplay(markers)

    // Tick enough to complete (2 segments x 2000ms base each)
    for (let i = 0; i < 40; i++) {
      useReplayStore.getState()._tick(200)
    }
    expect(useReplayStore.getState().status).toBe('completed')
    expect(useReplayStore.getState().totalProgress).toBe(1)
  })

  it('togglePlayPause from completed restarts', () => {
    useReplayStore.getState().startReplay(markers)
    for (let i = 0; i < 40; i++) {
      useReplayStore.getState()._tick(200)
    }
    expect(useReplayStore.getState().status).toBe('completed')

    useReplayStore.getState().togglePlayPause()
    expect(useReplayStore.getState().status).toBe('playing')
    expect(useReplayStore.getState().currentWaypointIndex).toBe(0)
    expect(useReplayStore.getState().totalProgress).toBe(0)
  })

  it('exitReplay resets all state', () => {
    useReplayStore.getState().startReplay(markers)
    useReplayStore.getState().exitReplay()

    const state = useReplayStore.getState()
    expect(state.status).toBe('idle')
    expect(state.isReplayMode).toBe(false)
    expect(state.waypoints).toHaveLength(0)
    expect(state.currentPosition).toBeNull()
  })
})
