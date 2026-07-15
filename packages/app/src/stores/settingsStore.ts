import type { AvatarSource } from '@/types/replay'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { i18n } from '@/i18n'
import { platformStorage } from '@/lib/zustand-storage'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  language: string
  avatarSource: AvatarSource
  mapSidebarExpanded: boolean
  setTheme: (theme: Theme) => void
  setLanguage: (lang: string) => void
  setAvatarSource: (source: AvatarSource) => void
  setMapSidebarExpanded: (expanded: boolean) => void
  toggleMapSidebar: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      theme: 'dark',
      language: 'en',
      avatarSource: { type: 'profile' } as AvatarSource,
      mapSidebarExpanded: false,
      setTheme: theme => set({ theme }),
      setLanguage: (lang) => {
        set({ language: lang })
        i18n.changeLanguage(lang)
      },
      setAvatarSource: avatarSource => set({ avatarSource }),
      setMapSidebarExpanded: mapSidebarExpanded => set({ mapSidebarExpanded }),
      toggleMapSidebar: () => set(state => ({ mapSidebarExpanded: !state.mapSidebarExpanded })),
    }),
    {
      name: 'locusify-settings',
      storage: createJSONStorage(() => platformStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language)
        }
      },
    },
  ),
)
