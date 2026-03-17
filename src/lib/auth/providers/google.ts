import type { AuthProvider } from '../types'
import { env } from '@/lib/env'
import { getBrowser, isNative } from '@/platforms'

async function login(): Promise<void> {
  const baseUrl = `${env.VITE_API_BASE_URL}/api/v1/auth/oauth/google`
  if (isNative()) {
    const url = `${baseUrl}?redirect_uri=${encodeURIComponent('locusify://auth/callback')}`
    await getBrowser().open(url)
  }
  else {
    const url = new URL(baseUrl)
    url.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`)
    window.location.href = url.toString()
  }
}

export const googleProvider: AuthProvider = {
  type: 'google',
  name: 'Google',
  login,
}
