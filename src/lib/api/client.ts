import { clearTokens, getAccessToken, getTokens, setTokens } from '@/lib/auth/token-storage'
import { env } from '@/lib/env'

const BASE_URL = import.meta.env.DEV
  ? '/api/v1'
  : `${env.VITE_API_BASE_URL}/api/v1`

export class ApiError extends Error {
  code: string
  details?: unknown
  i18nMessage?: Record<string, string>

  constructor(code: string, message: string, details?: unknown, i18nMessage?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.i18nMessage = i18nMessage
  }

  getLocalizedMessage(lang: string): string {
    if (this.i18nMessage) {
      return this.i18nMessage[lang] ?? this.i18nMessage.en ?? this.message
    }
    return this.message
  }
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string, message: Record<string, string>, details?: unknown }
}

let refreshPromise: Promise<boolean> | null = null

async function refreshToken(): Promise<boolean> {
  const { refreshToken } = await getTokens()
  if (!refreshToken)
    return false

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok)
      return false

    const json: ApiResponse<{ access_token: string, refresh_token: string }> = await res.json()
    if (json.success && json.data) {
      await setTokens(json.data.access_token, json.data.refresh_token)
      return true
    }
    return false
  }
  catch {
    return false
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const accessToken = await getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // 401 → attempt token refresh (deduplicated)
  if (res.status === 401 && accessToken) {
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => {
        refreshPromise = null
      })
    }
    const refreshed = await refreshPromise

    if (refreshed) {
      // Retry with new token
      const newToken = await getAccessToken()
      headers.Authorization = `Bearer ${newToken}`
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
    }
    else {
      // Refresh failed → clear auth state
      await clearTokens()
      // Dynamic import to avoid circular dependency
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.getState().clearUser()
      throw new ApiError('UNAUTHORIZED', 'Session expired')
    }
  }

  const json: ApiResponse<T> = await res.json()

  if (!json.success || json.error) {
    const i18nMessage = json.error?.message ?? {}

    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      i18nMessage.en ?? 'Request failed',
      json.error?.details,
      i18nMessage,
    )
  }

  return json.data as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
