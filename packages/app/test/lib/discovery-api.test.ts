import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverySources as backendSources, discoverySourceSchema } from '../../../backend/validators/discovery-source.validators'
import { discoveryRequest, discoverySources } from '../../src/lib/api/discovery-source'

const session = vi.hoisted(() => ({ accessToken: '' }))
vi.mock('@/lib/auth/token-storage', () => ({ useTokenStore: { getState: () => session } }))
vi.mock('@/lib/env', () => ({ env: { VITE_API_BASE_URL: 'http://localhost:1054' } }))
afterEach(() => vi.unstubAllGlobals())

describe('lOC-34 adapter contract', () => {
  it('uses the exact backend enums and allowed request shapes', () => {
    expect(discoverySources).toEqual(backendSources)
    for (const source of discoverySources)
      expect(discoverySourceSchema.safeParse({ source }).success).toBe(true)
    expect(discoverySourceSchema.safeParse({ status: 'skipped' }).success).toBe(true)
  })

  it('never sends a queued mutation using another account token', async () => {
    session.accessToken = `e30.${btoa(JSON.stringify({ sub: 'account-b' }))}.test`
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(discoveryRequest('account-a', { status: 'skipped' })).rejects.toThrow('Account changed')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('accepts ineligible GET and rejects malformed saved responses', async () => {
    session.accessToken = `e30.${btoa(JSON.stringify({ sub: 'account-a' }))}.test`
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { eligible: false, status: 'ineligible', source: null } })))
    vi.stubGlobal('fetch', fetcher)
    expect((await discoveryRequest('account-a')).status).toBe('ineligible')
    fetcher.mockResolvedValue(new Response(JSON.stringify({ success: true, data: { eligible: true, status: 'submitted', source: null } })))
    await expect(discoveryRequest('account-a', { source: 'bilibili' })).rejects.toThrow()
  })

  it('preserves HTTP failures even when the body is not JSON', async () => {
    session.accessToken = `e30.${btoa(JSON.stringify({ sub: 'account-a' }))}.test`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })))
    await expect(discoveryRequest('account-a')).rejects.toMatchObject({ status: 401 })
  })
})
