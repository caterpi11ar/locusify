export type TransportMode = 'walking' | 'cycling' | 'driving' | 'train' | 'flying' | 'unknown'

export type AvatarSource
  = | { type: 'profile' }
    | { type: 'preset', presetId: string }
    | { type: 'none' }

export interface SegmentMeta {
  fromIndex: number
  toIndex: number
  distanceKm: number
  timeDeltaMs: number
  mode: TransportMode
  /** Pre-computed interpolated curve points for this segment */
  curvePoints: [number, number][]
  /** Whether this is a long-distance jump (>200km) */
  isLongJump: boolean
}
