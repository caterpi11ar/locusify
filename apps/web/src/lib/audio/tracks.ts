export interface AudioTrack {
  id: string
  nameKey: string
  url: string
  mood: string
  durationSec: number
}

export const audioTracks: AudioTrack[] = [
  {
    id: 'upbeat',
    nameKey: 'template.music.upbeat',
    url: '/audio/upbeat.mp3',
    mood: 'energetic',
    durationSec: 120,
  },
  {
    id: 'acoustic',
    nameKey: 'template.music.acoustic',
    url: '/audio/acoustic.mp3',
    mood: 'warm',
    durationSec: 150,
  },
  {
    id: 'cinematic',
    nameKey: 'template.music.cinematic',
    url: '/audio/cinematic.mp3',
    mood: 'epic',
    durationSec: 180,
  },
  {
    id: 'ambient',
    nameKey: 'template.music.ambient',
    url: '/audio/ambient.mp3',
    mood: 'chill',
    durationSec: 200,
  },
  {
    id: 'orchestral',
    nameKey: 'template.music.orchestral',
    url: '/audio/orchestral.mp3',
    mood: 'majestic',
    durationSec: 160,
  },
  {
    id: 'none',
    nameKey: 'template.music.none',
    url: '',
    mood: 'silent',
    durationSec: 0,
  },
]

export function getTrackById(id: string): AudioTrack | undefined {
  return audioTracks.find(t => t.id === id)
}
