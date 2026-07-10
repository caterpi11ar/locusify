import type { AuthProvider } from '../types'
import { env } from '@/lib/env'

async function login(): Promise<void> {
  const url = new URL(`${env.VITE_API_BASE_URL}/api/v1/auth/oauth/github`)
  url.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`)
  window.location.href = url.toString()
}

export const githubProvider: AuthProvider = {
  type: 'github',
  name: 'GitHub',
  login,
}
