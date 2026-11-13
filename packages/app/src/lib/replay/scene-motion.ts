/** The scene and encoder advance together, independent of display refresh rate. */
export const FRAME_SECONDS = 1 / 60
export const FRAME_MS = 1000 / 60
export const SCENE_WIDTH = 1280
export const SCENE_HEIGHT = 720

export function easeScroll(progress: number) {
  const p = Math.max(0, Math.min(1, progress))
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2
}

/** Cubic bezier used by the existing photo transitions, evaluated by x. */
export function easePhoto(progress: number) {
  const x = Math.max(0, Math.min(1, progress))
  let lo = 0
  let hi = 1
  for (let i = 0; i < 14; i++) {
    const t = (lo + hi) / 2
    const value = 3 * (1 - t) ** 2 * t * 0.16 + 3 * (1 - t) * t ** 2 * 0.3 + t ** 3
    if (value < x)
      lo = t
    else hi = t
  }
  return 1 - (1 - (lo + hi) / 2) ** 3
}
