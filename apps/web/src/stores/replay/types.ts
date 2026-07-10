import type { PhotoMarker } from '@/types/map'
import type { SegmentMeta, TransportMode } from '@/types/replay'
import type { ReplayTemplateConfig } from '@/types/template'
import type { PlaybackState } from '@/types/workspace'

export type EarthZoomPhase = 'idle' | 'setup' | 'revealing' | 'flying' | 'done'

export interface ReplayWaypoint {
  id: string
  position: [number, number]
  marker: PhotoMarker
  timestamp: Date
  index: number
}

export interface ReplayState {
  isReplayMode: boolean
  waypoints: ReplayWaypoint[]
  status: PlaybackState['status']
  currentWaypointIndex: number
  segmentProgress: number
  totalProgress: number
  speedMultiplier: number
  currentPosition: [number, number] | null
  segments: SegmentMeta[]
  currentSegmentMode: TransportMode
  recordingActive: boolean
  templateId: string
  templateConfig: ReplayTemplateConfig
  customOverrides: Partial<ReplayTemplateConfig>
  captions: string[]
  earthZoomPhase: EarthZoomPhase
  dwellRemaining: number

  startReplay: (markers: PhotoMarker[], startPaused?: boolean) => void
  prepareReplay: (markers: PhotoMarker[]) => void
  confirmConfig: () => void
  togglePlayPause: () => void
  restartReplay: () => void
  resetReplay: () => void
  exitReplay: () => void
  setSpeedMultiplier: (speed: number) => void
  seekToWaypoint: (index: number) => void
  setSegmentMode: (segmentIndex: number, mode: TransportMode) => void
  setRecordingActive: (active: boolean) => void
  setTemplate: (templateId: string, config: ReplayTemplateConfig) => void
  setCustomOverrides: (overrides: Partial<ReplayTemplateConfig>) => void
  setCaptions: (captions: string[]) => void
  startEarthZoom: () => void
  setEarthZoomPhase: (phase: EarthZoomPhase) => void
  refreshReplay: (markers: PhotoMarker[]) => void
  _tick: (delta: number) => void
}
