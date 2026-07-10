export interface ReplayTemplate {
  id: string
  name: string
  nameKey: string
  description: string
  descriptionKey: string
  previewUrl: string
  tier: 'free' | 'pro'
  config: ReplayTemplateConfig
}

export interface ReplayTemplateConfig {
  music: {
    trackId: string
    volume: number
    fadeIn: number
    fadeOut: number
  }
  transitions: {
    type: TransitionType
    duration: number
  }
  filter: {
    type: FilterType
    intensity: number
  }
  textOverlay: {
    enabled: boolean
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    style: TextOverlayStyle
    showDate: boolean
    showLocation: boolean
    fontFamily: string
    color: string
    customText?: string
  }
  lineStyle: {
    color: string
    width: number
    glow: boolean
    animated: boolean
  }
  intro: {
    style: 'logo-fade' | 'title-card' | 'map-zoom' | 'none'
    duration: number
  }
  outro: {
    style: 'stats-card' | 'logo-fade' | 'none'
    duration: number
  }
  camera?: {
    followMode: 'smart' | 'fixed' | 'topdown'
    pitchEnabled: boolean
    bearingEnabled: boolean
    damping: number
  }
  segmentDuration: number
  defaultSpeed: number
}

export type TransitionType = 'cut' | 'crossfade' | 'slide-left' | 'slide-up' | 'zoom-in' | 'blur'
export type FilterType = 'none' | 'vintage' | 'warm' | 'cool' | 'b&w' | 'film' | 'cinematic'
export type TextOverlayStyle = 'handwritten' | 'minimal' | 'bold' | 'typewriter' | 'neon'
