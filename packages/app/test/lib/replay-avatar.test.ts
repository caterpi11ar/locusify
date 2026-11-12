import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { brandLogo } from '../../src/lib/brand'
import { prepareReplayAvatar } from '../../src/lib/replay/prepare-avatar'

beforeEach(() => {
  vi.stubGlobal('location', { href: 'https://app.example/', origin: 'https://app.example' })
  vi.stubGlobal('Image', class { decode = async () => {} })
})
afterEach(() => vi.unstubAllGlobals())

it('reuses preloaded avatar bytes so the isolated renderer needs no session', async () => {
  const blob = new Blob(['avatar'], { type: 'image/png' })
  const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob })
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('FileReader', class {
    result = 'data:image/png;base64,YXZhdGFy'
    onload?: () => void
    readAsDataURL(value: Blob) {
      expect(value).toBe(blob)
      this.onload?.()
    }
  })
  const first = await prepareReplayAvatar('/private/avatar.png')
  const second = await prepareReplayAvatar('/private/avatar.png')
  expect(first).toBe('data:image/png;base64,YXZhdGFy')
  expect(second).toBe(first)
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('rejects unreadable avatars without contacting an export server and retries later', async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('location', { href: 'https://app.example/' })
  const url = 'https://images.example/avatar.png'
  await expect(prepareReplayAvatar(url)).rejects.toThrow('avatar-unavailable')
  await expect(prepareReplayAvatar(url)).rejects.toThrow('avatar-unavailable')
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch.mock.calls.every(([requested]) => requested === url)).toBe(true)
})

it('uses the original cross-origin avatar when the image host allows CORS', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['original avatar']) })
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('FileReader', class {
    result = 'data:image/png;base64,b3JpZ2luYWw='
    onload?: () => void
    readAsDataURL() { this.onload?.() }
  })
  const url = 'https://images.example/cors-avatar.png'
  expect(await prepareReplayAvatar(url)).toBe('data:image/png;base64,b3JpZ2luYWw=')
  expect(fetch.mock.calls[0][0]).toBe(url)
  expect(await prepareReplayAvatar(url)).toBe('data:image/png;base64,b3JpZ2luYWw=')
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('does not cache an HTML error returned with HTTP 200 as an avatar', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['error page']) }))
  vi.stubGlobal('Image', class {
    decode = async () => { throw new Error('Invalid image') }
  })
  vi.stubGlobal('FileReader', class {
    result = 'data:text/html;base64,ZXJyb3I='
    onload?: () => void
    readAsDataURL() { this.onload?.() }
  })
  const url = 'https://images.example/error-avatar.png'
  await expect(prepareReplayAvatar(url)).rejects.toThrow('avatar-unavailable')
  await expect(prepareReplayAvatar(url)).rejects.toThrow('avatar-unavailable')
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('never passes the product logo off as a personal replay avatar', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(await prepareReplayAvatar(brandLogo)).toBe('')
  expect(await prepareReplayAvatar('')).toBe('')
  expect(fetch).not.toHaveBeenCalled()
})
