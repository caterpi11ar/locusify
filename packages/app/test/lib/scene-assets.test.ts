import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSceneImage } from '../../src/lib/replay/scene-assets'

describe('scene image lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  function stalledImage() {
    const removeAttribute = vi.fn()
    vi.stubGlobal('Image', class {
      removeAttribute = removeAttribute
      decode = () => new Promise<void>(() => {})
    })
    return removeAttribute
  }

  it('cancels an image whose decoder never settles', async () => {
    vi.useFakeTimers()
    const remove = stalledImage()
    const controller = new AbortController()
    const task = loadSceneImage('/photo.jpg', controller.signal)
    controller.abort()
    await expect(task).rejects.toMatchObject({ name: 'AbortError' })
    expect(remove).toHaveBeenCalledWith('src')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('releases a stalled image at the failure deadline', async () => {
    vi.useFakeTimers()
    const remove = stalledImage()
    const task = loadSceneImage('/photo.jpg', new AbortController().signal)
    const assertion = expect(task).rejects.toThrow('asset-unavailable')
    await vi.advanceTimersByTimeAsync(45000)
    await assertion
    expect(remove).toHaveBeenCalledWith('src')
    expect(vi.getTimerCount()).toBe(0)
  })
})
