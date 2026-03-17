import type { AuthMeResponse } from '@/lib/api/auth'
import type { AuthUser } from '@/lib/auth/types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultAvatar from '@/assets/locusify.png'
import { fetchAuthMe } from '@/lib/api/auth'
import { apiClient, ApiError } from '@/lib/api/client'
import { clearTokens, getTokens, setTokens } from '@/lib/auth/token-storage'
import { platformStorage } from '@/lib/zustand-storage'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

export interface UserProfile {
  id: string
  displayName: string
  avatarUrl: string
  provider: string
}

interface AuthState {
  user: AuthUser | null
  profile: UserProfile | null
  isLoggingIn: boolean
  authReady: boolean
  setUser: (user: AuthUser) => void
  setProfile: (profile: UserProfile | null) => void
  clearUser: () => void
  setLoggingIn: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      profile: null,
      isLoggingIn: false,
      authReady: false,
      setUser: user => set({ user, isLoggingIn: false }),
      setProfile: profile => set({ profile }),
      clearUser: () => {
        set({ user: null, profile: null })
        useSubscriptionStore.getState().clear()
        // Lazy import to avoid circular dependency (presenceStore → authStore)
        import('@/stores/presenceStore').then(m => m.usePresenceStore.getState().clear())
      },
      setLoggingIn: isLoggingIn => set({ isLoggingIn }),
    }),
    {
      name: 'locusify-auth',
      storage: createJSONStorage(() => platformStorage),
      partialize: state => ({ user: state.user }),
    },
  ),
)

interface ProfileResponse {
  id: string
  display_name: string | null
  avatar_url: string | null
  provider: string | null
}

/** Fetch profile, returning null if not found (404) */
async function fetchProfileSafe(): Promise<ProfileResponse | null> {
  try {
    return await apiClient.get<ProfileResponse>('/profile')
  }
  catch (err) {
    if (err instanceof ApiError && err.code === 'NOT_FOUND')
      return null
    throw err
  }
}

/** Build AuthUser from /auth/me + optional profile */
function buildAuthUser(me: AuthMeResponse, profile: ProfileResponse | null): AuthUser {
  const p = profile?.provider
  const provider: AuthUser['provider'] = p === 'github' ? 'github' : p === 'email' ? 'email' : 'google'
  return {
    id: me.id,
    name: profile?.display_name ?? me.email ?? 'User',
    avatarUrl: profile?.avatar_url || defaultAvatar,
    email: me.email,
    provider,
  }
}

/** Build UserProfile from profile response */
function buildUserProfile(profile: ProfileResponse): UserProfile {
  return {
    id: profile.id,
    displayName: profile.display_name ?? '',
    avatarUrl: profile.avatar_url ?? '',
    provider: profile.provider ?? '',
  }
}

export async function handleOAuthCallback(accessToken: string, refreshToken: string) {
  await setTokens(accessToken, refreshToken)

  const [me, profile] = await Promise.all([
    fetchAuthMe(),
    fetchProfileSafe(),
  ])

  useAuthStore.getState().setUser(buildAuthUser(me, profile))
  if (profile) {
    useAuthStore.getState().setProfile(buildUserProfile(profile))
  }

  useSubscriptionStore.getState().fetchSubscription().catch(console.error)
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout')
  }
  catch {
    // Logout API failure is non-critical
  }
  await clearTokens()
  useAuthStore.getState().clearUser()
}

export async function initializeAuth() {
  const { accessToken } = await getTokens()
  if (!accessToken) {
    useAuthStore.getState().clearUser()
    useAuthStore.setState({ authReady: true })
    return
  }

  try {
    const me = await fetchAuthMe()
    const profile = await fetchProfileSafe()

    useAuthStore.getState().setUser(buildAuthUser(me, profile))
    if (profile) {
      useAuthStore.getState().setProfile(buildUserProfile(profile))
    }

    useSubscriptionStore.getState().fetchSubscription().catch(console.error)
  }
  catch (err) {
    if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
      await clearTokens()
      useAuthStore.getState().clearUser()
    }
    else {
      console.error('Failed to validate auth session:', err)
    }
  }
  finally {
    useAuthStore.setState({ authReady: true })
  }
}
