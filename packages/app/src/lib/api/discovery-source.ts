import { useTokenStore } from '@/lib/auth/token-storage'
import { env } from '@/lib/env'

export const discoverySources = [
  'friend_colleague',
  'search',
  'x',
  'linkedin',
  'youtube',
  'github',
  'bilibili',
  'douyin',
  'xiaohongshu',
  'other_social',
  'blog_newsletter',
  'ai_assistant',
  'work',
  'offline_event',
  'dont_remember',
  'other',
] as const

export type DiscoverySource = typeof discoverySources[number]
export interface DiscoveryState {
  eligible: boolean
  status: 'ineligible' | 'pending' | 'submitted' | 'skipped'
  source: DiscoverySource | null
}
export type DiscoveryAnswer = { source: DiscoverySource } | { status: 'skipped' }

const baseUrl = import.meta.env.DEV ? '/api/v1' : `${env.VITE_API_BASE_URL}/api/v1`

// Capture a token belonging to this account. Never retry an old account's
// mutation with the new account's token during login/logout or token refresh.
export async function discoveryRequest(userId: string, answer?: DiscoveryAnswer): Promise<DiscoveryState> {
  const token = useTokenStore.getState().accessToken
  if (!token)
    throw new Error('Authentication required')
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  if (payload.sub !== userId)
    throw new Error('Account changed')

  const response = await fetch(`${baseUrl}/discovery-source`, {
    method: answer ? 'PUT' : 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: answer ? JSON.stringify(answer) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok)
    throw Object.assign(new Error('Discovery request failed'), { status: response.status })
  const result = await response.json()
  const data = result.data
  if (!response.ok || result.success !== true || !data
    || typeof data.eligible !== 'boolean'
    || !['ineligible', 'pending', 'submitted', 'skipped'].includes(data.status)
    || (data.status === 'submitted' ? !discoverySources.includes(data.source) : data.source !== null)) {
    throw new Error('Unable to save discovery source')
  }
  return data
}
