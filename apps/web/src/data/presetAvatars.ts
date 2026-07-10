export interface PresetAvatar {
  id: string
  nameKey: string
  icon: string
  color: string
}

export const presetAvatars: PresetAvatar[] = [
  {
    id: 'traveler',
    nameKey: 'settings.avatar.preset.traveler',
    icon: 'i-mingcute-luggage-line',
    color: '#38bdf8', // sky-400
  },
  {
    id: 'photographer',
    nameKey: 'settings.avatar.preset.photographer',
    icon: 'i-mingcute-camera-line',
    color: '#a78bfa', // violet-400
  },
  {
    id: 'explorer',
    nameKey: 'settings.avatar.preset.explorer',
    icon: 'i-mingcute-compass-line',
    color: '#34d399', // emerald-400
  },
  {
    id: 'backpacker',
    nameKey: 'settings.avatar.preset.backpacker',
    icon: 'i-mingcute-walk-line',
    color: '#fb923c', // orange-400
  },
  {
    id: 'cyclist',
    nameKey: 'settings.avatar.preset.cyclist',
    icon: 'i-mingcute-bike-line',
    color: '#f472b6', // pink-400
  },
]
