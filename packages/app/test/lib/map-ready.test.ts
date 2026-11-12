import type { Map as MapLibreMap } from 'maplibre-gl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForMapReady, waitForReplayTiles } from '../../src/lib/replay/map-ready'

function fakeMap() {
  const listeners = new Map<string, Set<() => void>>()
  const map = {
    loaded: vi.fn(() => true),
    areTilesLoaded: vi.fn(() => false),
    isMoving: vi.fn(() => false),
    triggerRepaint: vi.fn(),
    on: (event: string, fn: () => void) => {
      if (!listeners.has(event))
        listeners.set(event, new Set())
      listeners.get(event)!.add(fn)
    },
    off: (event: string, fn: () => void) => { listeners.get(event)?.delete(fn) },
  }
  return { map, target: map as unknown as MapLibreMap, emit: (event: string) => listeners.get(event)?.forEach(fn => fn()), listeners }
}

describe('map readiness gate', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps loading past the old intro timer until tiles are painted and movement ends', async () => {
    vi.useFakeTimers()
    const { map, target, emit, listeners } = fakeMap()
    const ready = vi.fn()
    const task = waitForMapReady(target, new AbortController().signal).then(ready)
    emit('render')
    await vi.advanceTimersByTimeAsync(8000)
    expect(ready).not.toHaveBeenCalled()
    map.areTilesLoaded.mockReturnValue(true)
    map.isMoving.mockReturnValue(true)
    emit('render')
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    map.isMoving.mockReturnValue(false)
    emit('idle')
    await task
    expect(ready).toHaveBeenCalledOnce()
    expect([...listeners.values()].every(set => set.size === 0)).toBe(true)
  })

  it('cancels without revealing a stale replay', async () => {
    const { target } = fakeMap()
    const controller = new AbortController()
    const task = waitForMapReady(target, controller.signal)
    controller.abort()
    await expect(task).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('reports a timeout instead of treating incomplete tiles as ready', async () => {
    vi.useFakeTimers()
    const { target } = fakeMap()
    const task = waitForMapReady(target, new AbortController().signal, 100)
    const assertion = expect(task).rejects.toThrow('map-unavailable')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
  })

  it('waits for tile data during camera motion without waiting for the animation to end', async () => {
    const { map, target, emit } = fakeMap()
    map.isMoving.mockReturnValue(true)
    const ready = vi.fn()
    const task = waitForReplayTiles(target, new AbortController().signal).then(ready)
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    map.areTilesLoaded.mockReturnValue(true)
    emit('sourcedata')
    await task
    expect(ready).toHaveBeenCalledOnce()
  })

  it('bounds a stalled tile request and removes its listeners', async () => {
    vi.useFakeTimers()
    const { target, listeners } = fakeMap()
    const task = waitForReplayTiles(target, new AbortController().signal)
    const assertion = expect(task).rejects.toThrow('map-unavailable')
    await vi.advanceTimersByTimeAsync(45000)
    await assertion
    expect([...listeners.values()].every(set => set.size === 0)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels a pending tile request on scene disposal', async () => {
    vi.useFakeTimers()
    const { target, listeners } = fakeMap()
    const controller = new AbortController()
    const task = waitForReplayTiles(target, controller.signal)
    controller.abort()
    await expect(task).rejects.toMatchObject({ name: 'AbortError' })
    expect([...listeners.values()].every(set => set.size === 0)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
