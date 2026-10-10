import type { StateStorage } from 'zustand/middleware'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { platformStorage } from '@/lib/zustand-storage'

export const TOKEN_STORAGE_KEY = 'locusify-tokens'

interface TokenState {
  accessToken: string | null
  refreshToken: string | null
  setTokenPair: (accessToken: string, refreshToken: string) => void
  clearTokenPair: () => void
}

/**
 * 旧版本把 token 以扁平结构 `{ accessToken, refreshToken }` 直接写在 localStorage，
 * 而 persist 期望信封格式 `{ state, version }`。
 * 这里在读取时做一次格式识别，否则所有已登录用户会在升级后首次启动被登出。
 */
const legacyAwareStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const raw = platformStorage.getItem(name)
    if (!raw)
      return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !('state' in parsed)) {
        // 旧格式扁平对象，升级成 persist 信封并立即回写，避免存储一直停在旧结构
        const envelope = JSON.stringify({ state: parsed, version: 1 })
        platformStorage.setItem(name, envelope)
        return envelope
      }
    }
    catch {
      // 不是合法 JSON，交给 persist 按空状态处理
      return null
    }
    return raw
  },
  setItem: (name: string, value: string) => platformStorage.setItem(name, value),
  removeItem: (name: string) => platformStorage.removeItem(name),
}

/**
 * Token 单独用一个 store：它被 `lib/api/client.ts` 直接读取，
 * 而 client.ts 又被 authStore 引用，塞进 authStore 会形成循环依赖。
 * 这里是个不依赖任何业务模块的叶子节点。
 */
export const useTokenStore = create<TokenState>()(
  persist(
    set => ({
      accessToken: null,
      refreshToken: null,
      setTokenPair: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearTokenPair: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: TOKEN_STORAGE_KEY,
      storage: createJSONStorage(() => legacyAwareStorage),
      version: 1,
    },
  ),
)

export async function getTokens(): Promise<{ accessToken: string | null, refreshToken: string | null }> {
  const { accessToken, refreshToken } = useTokenStore.getState()
  return { accessToken, refreshToken }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  useTokenStore.getState().setTokenPair(accessToken, refreshToken)
}

export async function clearTokens(): Promise<void> {
  useTokenStore.getState().clearTokenPair()
  // 与旧实现一致：登出后把 key 整个删掉，而不是留一对 null
  useTokenStore.persist.clearStorage()
}

export async function getAccessToken(): Promise<string | null> {
  return useTokenStore.getState().accessToken
}
