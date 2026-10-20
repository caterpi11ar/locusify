import { toCanvas } from 'html-to-image'

/**
 * Explicit property list handed to html-to-image.
 *
 * html-to-image's default copies *every* CSS property the document element
 * reports, which includes used values (`inline-size`, `block-size`, resolved
 * `width`). Those get baked into the clone as inline sizes and fight the
 * original flex/auto layout — a full-width flex bar collapses and its trailing
 * children (a QR code here) jump to the left. Listing the properties we
 * actually rely on keeps the clone's layout identical to the live DOM.
 */
const STYLE_PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'box-sizing', 'aspect-ratio',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'background-clip', 'background-origin', 'box-shadow', 'outline', 'opacity',
  'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-transform', 'text-indent',
  'text-decoration', 'text-shadow', 'white-space', 'overflow', 'overflow-x', 'overflow-y',
  'vertical-align', 'direction', 'writing-mode', 'list-style', 'list-style-type',
  'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-content', 'align-self', 'justify-content', 'justify-items', 'justify-self', 'order', 'gap',
  'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
  'grid-column', 'grid-row', 'object-fit', 'object-position', 'transform', 'transform-origin',
  'filter', 'backdrop-filter', 'mix-blend-mode', 'isolation', 'clip-path', 'mask-image',
  'fill', 'stroke', 'stroke-width', 'visibility',
]


import { HEIGHT, WIDTH, type Scene } from './scene'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Snapshot {
  canvas: HTMLCanvasElement
  ms: number
}

export interface OverlayBitmaps {
  /** Title, stats-card chrome (numbers filtered out), bottom bar chrome, watermark. */
  overlay: Snapshot
  /** Scrim/vignette the app lays over the map. */
  vignette: Snapshot
  /** Photo card, rasterised once; animated as a bitmap. */
  photo: Snapshot
  /** DOM marker + label, rasterised once; repositioned per frame. */
  pin: Snapshot
  photoRect: Rect
  statsRect: Rect
  barRect: Rect
  statsCardRect: Rect
  barRectOuter: Rect
  totalMs: number
}

const roundRect = (ctx: CanvasRenderingContext2D, r: Rect, radius: number) => {
  const { x, y, width, height } = r
  const rad = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + width, y, x + width, y + height, rad)
  ctx.arcTo(x + width, y + height, x, y + height, rad)
  ctx.arcTo(x, y + height, x, y, rad)
  ctx.arcTo(x, y, x + width, y, rad)
  ctx.closePath()
}

const rectOf = (el: Element, stage: Element): Rect => {
  const a = el.getBoundingClientRect()
  const b = stage.getBoundingClientRect()
  return { x: a.left - b.left, y: a.top - b.top, width: a.width, height: a.height }
}

/** Layout box with any per-frame transform removed. */
function neutralRect(el: HTMLElement, stage: Element): Rect {
  const prev = el.style.transform
  el.style.transform = 'none'
  const rect = rectOf(el, stage)
  el.style.transform = prev
  return rect
}

/**
 * Box for the cloned root inside html-to-image's SVG host.
 *
 * `absolute` (not `static`) keeps the clone a containing block for its
 * absolutely-positioned children while pinning it to (0,0); the explicit box is
 * required because an absolutely-positioned node with `right:auto` is
 * shrink-to-fit, which silently collapsed the full-width bottom bar. Pinning
 * also drops the element's own margins — left alone, `margin-top: 18px` on the
 * stats row pushed the patch 18px down inside its viewport and clipped it.
 */
const hostBox = (width: number, height: number) => ({
  position: 'absolute' as const,
  left: '0px',
  top: '0px',
  right: 'auto',
  bottom: 'auto',
  width: `${width}px`,
  height: `${height}px`,
  boxSizing: 'border-box' as const,
  margin: '0px',
  transform: 'none',
  opacity: '1',
})

async function snap(el: HTMLElement, width: number, height: number): Promise<Snapshot> {
  const t0 = performance.now()
  // Elements that are animated per frame must be rasterised in their neutral
  // pose, otherwise the transform baked into the bitmap gets applied twice.
  const prevTransform = el.style.transform
  const prevOpacity = el.style.opacity
  el.style.transform = 'none'
  el.style.opacity = '1'
  const canvas = await toCanvas(el, {
    width,
    height,
    includeStyleProperties: STYLE_PROPS,
    pixelRatio: 1,
    skipAutoScale: true,
    cacheBust: false,
    backgroundColor: undefined,
    style: hostBox(width, height),
  }).finally(() => {
    el.style.transform = prevTransform
    el.style.opacity = prevOpacity
  })
  return { canvas, ms: performance.now() - t0 }
}

export async function snapshotOverlays(scene: Scene): Promise<OverlayBitmaps> {
  const t0 = performance.now()
  // Hide the per-frame numbers for the chrome pass. `visibility: hidden` keeps
  // their boxes in flow, so the rest of the card/bar lays out exactly as live.
  const hidden = [scene.statsValues, scene.barDynamic]
  const prevVisibility = hidden.map(el => el.style.visibility)
  hidden.forEach(el => { el.style.visibility = 'hidden' })
  const overlay = await snap(scene.overlay, WIDTH, HEIGHT).finally(() => {
    hidden.forEach((el, i) => { el.style.visibility = prevVisibility[i] })
  })
  const vignette = await snap(scene.vignette, WIDTH, HEIGHT)
  const photo = await snap(scene.photoCard, scene.photoCard.offsetWidth, scene.photoCard.offsetHeight)
  const pin = await snap(scene.pin, scene.pin.offsetWidth, scene.pin.offsetHeight)
  return {
    overlay,
    vignette,
    photo,
    pin,
    photoRect: neutralRect(scene.photoCard, scene.stage),
    statsRect: rectOf(scene.statsValues, scene.stage),
    barRect: rectOf(scene.barDynamic, scene.stage),
    statsCardRect: rectOf(scene.statsCard, scene.stage),
    barRectOuter: rectOf(scene.bottomBar, scene.stage),
    totalMs: performance.now() - t0,
  }
}

/** Cheap per-frame rasterisation of the two live-number regions. */
export async function snapshotPatches(
  scene: Scene,
  bitmaps: OverlayBitmaps,
): Promise<{ stats: HTMLCanvasElement, bar: HTMLCanvasElement, ms: number }> {
  const t0 = performance.now()
  const statsW = Math.round(bitmaps.statsRect.width)
  const statsH = Math.round(bitmaps.statsRect.height)
  const barW = Math.round(bitmaps.barRect.width)
  const barH = Math.round(bitmaps.barRect.height)
  const stats = await toCanvas(scene.statsValues, {
    includeStyleProperties: STYLE_PROPS,
    style: hostBox(statsW, statsH),
    width: statsW,
    height: statsH,
    pixelRatio: 1,
    skipAutoScale: true,
    backgroundColor: undefined,
  })
  const bar = await toCanvas(scene.barDynamic, {
    includeStyleProperties: STYLE_PROPS,
    style: hostBox(barW, barH),
    width: barW,
    height: barH,
    pixelRatio: 1,
    skipAutoScale: true,
    backgroundColor: undefined,
  })
  return { stats, bar, ms: performance.now() - t0 }
}

/**
 * Emulates `backdrop-filter: blur()` by blurring the already-drawn map inside
 * a rounded clip. Canvas 2D cannot blur "whatever is behind" on its own, so we
 * downscale, blur, and upscale — this is what a production compositor needs.
 */
function drawGlassBackdrop(
  ctx: CanvasRenderingContext2D,
  mapCanvas: HTMLCanvasElement,
  rect: Rect,
  radius: number,
  blurPx: number,
): void {
  const pad = Math.ceil(blurPx * 2)
  const sx = Math.max(0, rect.x - pad)
  const sy = Math.max(0, rect.y - pad)
  const sw = Math.min(WIDTH - sx, rect.width + pad * 2)
  const sh = Math.min(HEIGHT - sy, rect.height + pad * 2)

  const scale = 0.25
  const tmp = document.createElement('canvas')
  tmp.width = Math.max(1, Math.round(sw * scale))
  tmp.height = Math.max(1, Math.round(sh * scale))
  const tctx = tmp.getContext('2d')!
  tctx.imageSmoothingQuality = 'high'
  tctx.drawImage(mapCanvas, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height)

  ctx.save()
  roundRect(ctx, rect, radius)
  ctx.clip()
  ctx.filter = `blur(${Math.max(1, blurPx * scale)}px) saturate(1.25)`
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, sx, sy, sw, sh)
  ctx.filter = 'none'
  ctx.restore()
}

export interface ComposeOptions {
  mapCanvas: HTMLCanvasElement
  bitmaps: OverlayBitmaps
  scene: Scene
  glass: boolean
  patches?: { stats: HTMLCanvasElement, bar: HTMLCanvasElement }
  /** Naive mode: everything is re-rasterised per frame (the v1.3 approach). */
  naive?: { overlay: HTMLCanvasElement, photo: HTMLCanvasElement, pin: HTMLCanvasElement }
}

export function composeFrame(ctx: CanvasRenderingContext2D, opts: ComposeOptions): void {
  const { mapCanvas, bitmaps, scene, glass, patches, naive } = opts
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  ctx.drawImage(mapCanvas, 0, 0, WIDTH, HEIGHT)
  ctx.drawImage(bitmaps.vignette.canvas, 0, 0)

  if (glass) {
    drawGlassBackdrop(ctx, mapCanvas, bitmaps.statsCardRect, 30, 26)
    drawGlassBackdrop(ctx, mapCanvas, bitmaps.barRectOuter, 24, 20)
  }

  // Photo card: already-rasterised bitmap, animated with a transform.
  const photo = naive?.photo ?? bitmaps.photo.canvas
  const tf = scene.photoCard.style.transform
  const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([\d.]+)\)/.exec(tf)
  const dx = m ? Number(m[1]) : 0
  const sc = m ? Number(m[3]) : 1
  const r = bitmaps.photoRect
  ctx.save()
  ctx.globalAlpha = Number(scene.photoCard.style.opacity || 1)
  ctx.translate(r.x + dx + r.width / 2, r.y + r.height / 2)
  ctx.scale(sc, sc)
  ctx.translate(-r.width / 2, -r.height / 2)
  ctx.drawImage(photo, 0, 0, r.width, r.height)
  ctx.restore()

  // Static overlay (title, card chrome, bar chrome, watermark).
  ctx.drawImage(naive?.overlay ?? bitmaps.overlay.canvas, 0, 0)

  // Live numbers on top of the holes left by filtering `dynamic` nodes out.
  if (!naive && patches) {
    ctx.drawImage(patches.stats, bitmaps.statsRect.x, bitmaps.statsRect.y)
    ctx.drawImage(patches.bar, bitmaps.barRect.x, bitmaps.barRect.y)
  }

  // Marker: bitmap blitted at the projected position.
  ctx.drawImage(naive?.pin ?? bitmaps.pin.canvas, scene.pinX, scene.pinY)
}
