import type { ReplayTemplateConfig } from '@/types/template'
import AudioManager from '@/lib/audio/AudioManager'
import { useReplayStore } from '@/stores/replayStore'

export interface RecordingOptions {
  width: number
  height: number
  music: ReplayTemplateConfig['music']
}

export function createRecordingOptions(): RecordingOptions {
  const music = { ...useReplayStore.getState().templateConfig.music }
  if (AudioManager.isUnavailable(music.trackId))
    music.trackId = 'none'
  return { width: 1920, height: 1080, music }
}
