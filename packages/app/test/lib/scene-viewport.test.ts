import { describe, expect, it } from 'vitest'
import { getSceneViewport } from '../../src/lib/replay/scene-viewport'

describe('preview and recording pixel density', () => {
  it.each([[2560, 1000, 1], [1920, 1080, 2], [1280, 900, 1.25]])('keeps preview at native pixels for %sx%s at DPR %s', (width, height, dpr) => {
    const viewport = getSceneViewport(width, height, dpr, false)
    expect(viewport.width * viewport.resolution).toBeCloseTo(width * dpr)
    expect(viewport.height * viewport.resolution).toBeCloseTo(height * dpr)
    expect(viewport.mapPixelRatio).toBe(dpr)
  })

  it.each([[1920, 1080, 1], [1280, 720, 2], [2560, 1440, 1.25]])('keeps recording 1080p at %sx%s and DPR %s', (width, height, dpr) => {
    const viewport = getSceneViewport(width, height, dpr, true)
    expect(viewport.width * viewport.resolution).toBe(1920)
    expect(viewport.height * viewport.resolution).toBe(1080)
    expect(viewport.mapPixelRatio * width).toBe(1920)
  })
})
