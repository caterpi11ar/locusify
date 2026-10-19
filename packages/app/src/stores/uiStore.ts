import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { platformStorage } from '@/lib/zustand-storage'

export const UI_STORE_KEY = 'locusify-ui'

/**
 * 迁移前的三个裸 localStorage key。
 * 以前由 MapSection 直接读写，现在统一收编到 persist 中间件，这里只在首次启动搬运一次。
 */
const LEGACY_KEYS = {
  announcement: 'locusify:version',
  helpSeen: 'locusify:help-seen',
  feedback: 'locusify:feedback-last-shown',
} as const

/**
 * 把旧的裸 key 组装成 persist 的信封格式 `{ state, version }`。
 *
 * 先落盘再清旧 key：反过来的话，若此后没有任何 set()，下次启动就无数据可搬，
 * 老用户会重新看到已经关过的公告和引导。
 */
function adoptLegacyState(name: string): string | null {
  const announcement = platformStorage.getItem(LEGACY_KEYS.announcement)
  const helpSeen = platformStorage.getItem(LEGACY_KEYS.helpSeen)
  const feedback = platformStorage.getItem(LEGACY_KEYS.feedback)
  if (announcement === null && helpSeen === null && feedback === null)
    return null

  const feedbackAt = feedback === null ? null : Number(feedback)
  const envelope = JSON.stringify({
    state: {
      announcementSeenVersion: announcement,
      helpSeen: helpSeen === 'true',
      feedbackLastShown: feedbackAt !== null && Number.isFinite(feedbackAt) ? feedbackAt : null,
    },
    version: 1,
  })
  platformStorage.setItem(name, envelope)
  for (const key of Object.values(LEGACY_KEYS))
    platformStorage.removeItem(key)
  return envelope
}

const storage = createJSONStorage(() => ({
  getItem: (name: string) => platformStorage.getItem(name) ?? adoptLegacyState(name),
  setItem: (name: string, value: string) => platformStorage.setItem(name, value),
  removeItem: (name: string) => platformStorage.removeItem(name),
}))

interface UiState {
  /** 已确认过的公告版本；与当前包版本不一致时弹公告 */
  announcementSeenVersion: string | null
  /** 是否看过新手引导 */
  helpSeen: boolean
  /** 上次展示反馈弹窗的时间戳（按 FEEDBACK_INTERVAL_MS 节流） */
  feedbackLastShown: number | null
  markAnnouncementSeen: (version: string) => void
  markHelpSeen: () => void
  markFeedbackShown: (at?: number) => void
}

export const useUiStore = create<UiState>()(
  persist(
    set => ({
      announcementSeenVersion: null,
      helpSeen: false,
      feedbackLastShown: null,
      markAnnouncementSeen: version => set({ announcementSeenVersion: version }),
      markHelpSeen: () => set({ helpSeen: true }),
      markFeedbackShown: at => set({ feedbackLastShown: at ?? Date.now() }),
    }),
    {
      name: UI_STORE_KEY,
      storage,
      version: 1,
    },
  ),
)
