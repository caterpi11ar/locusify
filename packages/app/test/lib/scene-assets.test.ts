import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSceneImage, prepareScenePhotos } from '../../src/lib/replay/scene-assets'

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

  function controlledImages() {
    const pending = new Map<string, { resolve: () => void, reject: () => void }>()
    vi.stubGlobal('Image', class {
      src = ''
      removeAttribute = vi.fn()
      decode = () => new Promise<void>((resolve, reject) => {
        pending.set(this.src, { resolve, reject: () => reject(new Error('unavailable')) })
      })
    })
    return pending
  }

  it('shows a ready thumbnail before originals and keeps export waiting for quality', async () => {
    const pending = controlledImages()
    const controller = new AbortController()
    const shown: string[] = []
    let presented!: () => void
    const preview = new Promise<void>((resolve) => {
      presented = resolve
    })
    let ready = false
    const task = prepareScenePhotos([{ thumbnailUrl: '/small', originalUrl: '/large' }], controller.signal, (_, image) => {
      shown.push(image.src)
      presented()
    }).then(() => { ready = true })
    pending.get('/small')!.resolve()
    await preview
    expect(shown).toEqual(['/small'])
    expect(ready).toBe(false)
    pending.get('/large')!.resolve()
    await task
    expect(shown).toEqual(['/small', '/large'])
    expect(ready).toBe(true)
    controller.abort()
  })

  it('does not let a slow thumbnail block or downgrade an available original', async () => {
    const pending = controlledImages()
    const controller = new AbortController()
    const shown = vi.fn()
    const task = prepareScenePhotos([{ thumbnailUrl: '/small', originalUrl: '/large' }], controller.signal, shown)
    pending.get('/large')!.resolve()
    await task
    expect(shown).toHaveBeenCalledOnce()
    expect(shown.mock.calls[0][1].src).toBe('/large')
    controller.abort()
  })

  it('falls back to the available thumbnail when an original fails', async () => {
    const pending = controlledImages()
    const controller = new AbortController()
    const shown = vi.fn()
    const task = prepareScenePhotos([{ thumbnailUrl: '/small', originalUrl: '/large' }], controller.signal, shown)
    pending.get('/small')!.resolve()
    pending.get('/large')!.reject()
    await task
    expect(shown).toHaveBeenCalledOnce()
    expect(shown.mock.calls[0][1].src).toBe('/small')
    controller.abort()
  })
})
