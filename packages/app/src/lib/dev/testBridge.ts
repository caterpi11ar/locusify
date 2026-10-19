import type { AuthUser } from '@/lib/auth/types'
import { TOKEN_STORAGE_KEY, useTokenStore } from '@/lib/auth/token-storage'
import { ANNOUNCEMENT_VERSION } from '@/pages/map/constants'
import { useAuthStore } from '@/stores/authStore'
import { UI_STORE_KEY, useUiStore } from '@/stores/uiStore'

/** E2E 身份。定义在应用侧，测试不必知道 AuthUser 的形状。 */
const E2E_USER: AuthUser = {
  id: 'e2e-user-0001',
  name: 'E2E Tester',
  avatarUrl: '',
  email: 'e2e@locusify.dev',
  provider: 'email',
}

/**
 * 暴露给 E2E 的状态入口（仅 dev）。
 *
 * 存在的意义：测试**不要**自己去拼 localStorage 的 key 和 JSON 结构。
 * 那样等于把 persist 中间件的序列化格式复制到测试里，store 一旦改
 * name / version / partialize / migrate，测试会静默失效。
 * 这里所有写入都走 store 的 setState，由 persist 中间件负责落盘。
 */
export interface LocusifyTestBridge {
  /**
   * 写入登录态。之后 reload，initializeAuth() 会走真实的 /auth/me 流程把用户刷新一遍。
   * 同时写 user 而不是只写 token：MapSection 的 `useState(() => !user)` 在首屏
   * 取不到 user 就会弹出登录抽屉，而后即使 user 到位也没有任何逻辑会关掉它。
   */
  signIn: (accessToken?: string, refreshToken?: string) => void
  /** 关掉公告 / 新手引导 / 反馈弹窗 */
  dismissOverlays: () => void
  /** 清空全部持久化状态，回到首次访问 */
  reset: () => void
  /** 当前包的版本号，用于断言公告逻辑 */
  announcementVersion: string
  /** 本次实际用到的持久化 key，测试可直接断言它们存在 */
  storageKeys: { tokens: string, ui: string, auth: string, settings: string }
}

declare global {
  interface Window {
    __locusify?: LocusifyTestBridge
  }
}

export function installTestBridge(): void {
  if (!import.meta.env.DEV)
    return

  window.__locusify = {
    signIn: (accessToken = 'e2e-access-token', refreshToken = 'e2e-refresh-token') => {
      useTokenStore.getState().setTokenPair(accessToken, refreshToken)
      useAuthStore.getState().setUser(E2E_USER)
    },
    dismissOverlays: () => {
      const ui = useUiStore.getState()
      ui.markAnnouncementSeen(ANNOUNCEMENT_VERSION)
      ui.markHelpSeen()
      ui.markFeedbackShown()
    },
    reset: () => {
      useTokenStore.getState().clearTokenPair()
      useTokenStore.persist.clearStorage()
      useUiStore.setState({ announcementSeenVersion: null, helpSeen: false, feedbackLastShown: null })
      useUiStore.persist.clearStorage()
      useAuthStore.getState().clearUser()
      useAuthStore.persist.clearStorage()
    },
    announcementVersion: ANNOUNCEMENT_VERSION,
    storageKeys: {
      tokens: TOKEN_STORAGE_KEY,
      ui: UI_STORE_KEY,
      auth: 'locusify-auth',
      settings: 'locusify-settings',
    },
  }
}
