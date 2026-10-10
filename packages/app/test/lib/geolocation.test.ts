import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentPosition, isGeolocationGranted, isPermissionDenied } from '@/lib/geolocation'

const originalNavigator = globalThis.navigator

function stubNavigator(value: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
    writable: true,
  })
  vi.restoreAllMocks()
})

describe('isGeolocationGranted', () => {
  it('returns false when geolocation is unsupported', async () => {
    stubNavigator({})
    expect(await isGeolocationGranted()).toBe(false)
  })

  it('returns false when the Permissions API is unavailable', async () => {
    stubNavigator({ geolocation: {} })
    expect(await isGeolocationGranted()).toBe(false)
  })

  it('returns true only for the granted state', async () => {
    stubNavigator({
      geolocation: {},
      permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    })
    expect(await isGeolocationGranted()).toBe(true)
  })

  it('returns false for prompt and denied states', async () => {
    for (const state of ['prompt', 'denied']) {
      stubNavigator({
        geolocation: {},
        permissions: { query: vi.fn().mockResolvedValue({ state }) },
      })
      expect(await isGeolocationGranted()).toBe(false)
    }
  })

  it('returns false when querying throws (e.g. unsupported permission name)', async () => {
    stubNavigator({
      geolocation: {},
      permissions: { query: vi.fn().mockRejectedValue(new Error('unsupported')) },
    })
    expect(await isGeolocationGranted()).toBe(false)
  })
})

describe('isPermissionDenied', () => {
  it('detects PERMISSION_DENIED (code 1)', () => {
    expect(isPermissionDenied({ code: 1 })).toBe(true)
  })

  it('does not treat timeouts or position-unavailable as denial', () => {
    expect(isPermissionDenied({ code: 2 })).toBe(false)
    expect(isPermissionDenied({ code: 3 })).toBe(false)
  })

  it('handles non-object values', () => {
    expect(isPermissionDenied(null)).toBe(false)
    expect(isPermissionDenied(undefined)).toBe(false)
    expect(isPermissionDenied('denied')).toBe(false)
  })
})

describe('getCurrentPosition', () => {
  it('rejects when geolocation is unsupported', async () => {
    stubNavigator({})
    await expect(getCurrentPosition()).rejects.toThrow('Geolocation is not supported')
  })

  it('forwards options and resolves with the position', async () => {
    const position = { coords: { longitude: 1, latitude: 2 } }
    const getCurrentPositionSpy = vi.fn((resolve: (p: unknown) => void) => resolve(position))
    stubNavigator({ geolocation: { getCurrentPosition: getCurrentPositionSpy } })

    const options = { enableHighAccuracy: true, timeout: 10000 }
    await expect(getCurrentPosition(options)).resolves.toBe(position)
    expect(getCurrentPositionSpy.mock.calls[0][2]).toBe(options)
  })
})
