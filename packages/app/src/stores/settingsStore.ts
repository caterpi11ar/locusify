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
  setTheme: (theme: Theme) => void
  setLanguage: (lang: string) => void
  setAvatarSource: (source: AvatarSource) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      theme: 'dark',
      language: 'en',
      avatarSource: { type: 'profile' } as AvatarSource,
      setTheme: theme => set({ theme }),
      setLanguage: (lang) => {
        set({ language: lang })
        i18n.changeLanguage(lang)
        const localizedPath = lang.toLowerCase().startsWith('zh') ? '/zh-CN/' : '/en/'
        if (window.location.pathname === '/en/' || window.location.pathname === '/zh-CN/' || window.location.pathname === '/') {
          window.history.replaceState(window.history.state, '', `${localizedPath}${window.location.search}${window.location.hash}`)
        }
      },
      setAvatarSource: avatarSource => set({ avatarSource }),
    }),
    {
      name: 'locusify-settings',
      storage: createJSONStorage(() => platformStorage),
      onRehydrateStorage: () => (state) => {
        if (!state?.language)
          return
        // 语言以 URL 为准：/en/ 和 /zh-CN/ 由路由 loader 设置（见 routers/index.tsx），
        // 持久化的用户偏好不能覆盖它。否则全新访客访问 /zh-CN/ 会被默认的 'en' 顶掉，
        // 而老用户带着 zh-CN 偏好访问 /en/ 又会看到中文，两条语言路由都形同虚设。
        const { pathname } = window.location
        if (pathname === '/en/' || pathname === '/zh-CN/')
          return
        i18n.changeLanguage(state.language)
      },
    },
  ),
)
