import type { EncodeResult } from '../src/webcodecs'
/**
 * Runs INSIDE the real Locusify page (bundled to an IIFE by esbuild and
 * injected with addScriptTag). It only *reads* the app's DOM and rasterises it;
 * it never touches app state, styles or components.
 *
 * Two strategies are exposed:
 *   full   — rasterise the whole 16:9 capture box every frame (simplest, faithful, slow)
 *   split  — rasterise the static UI once, then per frame draw
 *            map canvas + glass blur + static overlay + small re-rasterised patches
 */
import { toCanvas } from 'html-to-image'
import { decodeFrameAtCanvas } from '../src/decode'
import { encodeWebCodecs } from '../src/webcodecs'

/** The 16:9 region-capture box the app itself records (`cropRef`). */
export function findBox(): HTMLElement {
  const el = [...document.querySelectorAll('div')].find(d => (d.style?.width ?? '').startsWith('min(100%'))
  if (!el)
    throw new Error('capture box not found')
  return el as HTMLElement
}

interface Rect { x: number, y: number, w: number, h: number }

function relRect(el: HTMLElement, box: DOMRect): Rect {
  const r = el.getBoundingClientRect()
  return { x: r.x - box.x, y: r.y - box.y, w: r.width, h: r.height }
}

const isCanvas = (n: Node) => n instanceof HTMLCanvasElement
const dataURL = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/png')

/** Elements whose backdrop-filter has to be re-created by hand. */
function glassElements(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>('*')].filter((el) => {
    if (isCanvas(el))
      return false
    const cs = getComputedStyle(el)
    if (cs.backdropFilter === 'none' || cs.backdropFilter === '')
      return false
    const r = el.getBoundingClientRect()
    return r.width > 24 && r.height > 24
  })
}

/**
 * Re-create `backdrop-filter: blur(Npx)` for one element.
 *
 * A rasterised DOM (SVG foreignObject) has no backdrop to sample, so glass
 * panels come out flat. The backdrop we DO have is the composed map layer, so
 * blur that region of the canvas in place, clipped to the panel's rounded box.
 */
function blurBackdrop(ctx: CanvasRenderingContext2D, el: HTMLElement, box: DOMRect, canvas: HTMLCanvasElement) {
  const cs = getComputedStyle(el)
  const blur = /blur\(([\d.]+)px\)/.exec(cs.backdropFilter)?.[1]
  if (!blur)
    return
  const r = relRect(el, box)
  if (r.w < 2 || r.h < 2)
    return
  const radius = Number.parseFloat(cs.borderTopLeftRadius) || 0
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(radius, r.w / 2, r.h / 2))
  ctx.clip()
  ctx.filter = `blur(${Math.min(Number(blur), 40)}px)`
  ctx.drawImage(canvas, 0, 0)
  ctx.filter = 'none'
  ctx.restore()
}

function rasterOpts(width: number, height: number) {
  return {
    width,
    height,
    pixelRatio: 1,
    skipAutoScale: true,
    cacheBust: false,
    style: { margin: '0px', transform: 'none', opacity: '1' },
  }
}

export async function rasterFull(): Promise<{ canvas: HTMLCanvasElement, ms: number }> {
  const t0 = performance.now()
  const box = findBox()
  const rect = box.getBoundingClientRect()
  const canvas = await toCanvas(box, rasterOpts(Math.round(rect.width), Math.round(rect.height)))
  return { canvas, ms: performance.now() - t0 }
}

/**
 * Static UI only: the map canvas is excluded so it can be drawn separately.
 *
 * The capture box itself carries `bg-black` (it is the letterbox background for
 * the 16:9 crop), which would paint over the map we draw underneath — so the
 * clone's root background is forced transparent and only the real overlays are
 * rasterised.
 */
async function rasterStatic(width: number, height: number) {
  const box = findBox()
  const canvas = await toCanvas(box, {
    ...rasterOpts(width, height),
    style: { ...rasterOpts(width, height).style, background: 'transparent', backgroundImage: 'none' },
    filter: (n: HTMLElement) => !isCanvas(n),
  })
  return canvas
}

interface Patch { el: HTMLElement, rect: Rect }

/** Elements whose text changed between two DOM snapshots, de-duplicated to the smallest owner. */
export function textSnapshot(): Map<HTMLElement, string> {
  const box = findBox()
  const map = new Map<HTMLElement, string>()
  for (const el of box.querySelectorAll<HTMLElement>('*')) {
    if (isCanvas(el))
      continue
    // only leaves matter: a parent's textContent aggregates its children's
    if (el.children.length === 0)
      map.set(el, `${el.textContent ?? ''}`)
  }
  return map
}

export function changedPatches(prev: Map<HTMLElement, string>): Patch[] {
  const box = findBox()
  const rect = box.getBoundingClientRect()
  const patches: Patch[] = []
  for (const el of box.querySelectorAll<HTMLElement>('*')) {
    if (isCanvas(el) || el.children.length > 0)
      continue
    const before = prev.get(el)
    if (before !== undefined && before !== (el.textContent ?? '')) {
      const r = relRect(el, rect)
      if (r.w > 1 && r.h > 1)
        patches.push({ el, rect: r })
    }
  }
  return patches
}

async function rasterPatch(p: Patch): Promise<HTMLCanvasElement> {
  return toCanvas(p.el, { ...rasterOpts(Math.round(p.rect.w), Math.round(p.rect.h)) })
}

export interface FrameResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
  mapMs: number
  glassMs: number
  staticMs: number
  patchMs: number
  totalMs: number
  glassCount: number
  patchCount: number
}

export function newFrameCanvas(): { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } {
  const box = findBox()
  const rect = box.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(rect.width)
  canvas.height = Math.round(rect.height)
  return { canvas, ctx: canvas.getContext('2d')! }
}

/** Draw map + glass into an existing frame canvas (cheap, per frame). */
function drawMapAndGlass(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, glass = true) {
  const box = findBox()
  const rect = box.getBoundingClientRect()
  const tMap = performance.now()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const mapCanvas = box.querySelector<HTMLCanvasElement>('canvas.maplibregl-canvas')
  if (mapCanvas) {
    const r = relRect(mapCanvas, rect)
    ctx.drawImage(mapCanvas, r.x, r.y, r.w, r.h)
  }
  const mapMs = performance.now() - tMap
  const tGlass = performance.now()
  const glasses = glass ? glassElements(box) : []
  for (const el of glasses)
    blurBackdrop(ctx, el, rect, canvas)
  return { mapMs, glassMs: performance.now() - tGlass, glassCount: glasses.length }
}

/** Whole-box raster on top of the map (naive per-frame path). */
export async function composeFull(glass = true): Promise<FrameResult> {
  const t0 = performance.now()
  const { canvas, ctx } = newFrameCanvas()
  const g = drawMapAndGlass(ctx, canvas, glass)
  const tRaster = performance.now()
  const box = findBox()
  const raster = await toCanvas(box, rasterOpts(canvas.width, canvas.height))
  ctx.drawImage(raster, 0, 0)
  const rasterMs = performance.now() - tRaster
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    mapMs: g.mapMs,
    glassMs: g.glassMs,
    staticMs: rasterMs,
    patchMs: 0,
    totalMs: performance.now() - t0,
    glassCount: g.glassCount,
    patchCount: 0,
  }
}

export interface StaticLayer { canvas: HTMLCanvasElement, width: number, height: number, ms: number }

export async function prepareStatic(): Promise<StaticLayer> {
  const box = findBox()
  const rect = box.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  const t0 = performance.now()
  const canvas = await rasterStatic(width, height)
  return { canvas, width, height, ms: performance.now() - t0 }
}

/**
 * map + glass + cached static overlay + freshly rasterised text patches.
 * Pass `target` to composite into an existing canvas (the encoder's canvas).
 */
export async function composeSplit(
  staticLayer: StaticLayer,
  prev?: Map<HTMLElement, string>,
  target?: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D },
): Promise<FrameResult> {
  const t0 = performance.now()
  const { canvas, ctx } = target ?? newFrameCanvas()
  const g = drawMapAndGlass(ctx, canvas, true)
  ctx.drawImage(staticLayer.canvas, 0, 0)
  const tPatch = performance.now()
  const patches = prev ? changedPatches(prev) : []
  for (const p of patches) {
    const img = await rasterPatch(p)
    ctx.drawImage(img, p.rect.x, p.rect.y)
  }
  const patchMs = performance.now() - tPatch
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    mapMs: g.mapMs,
    glassMs: g.glassMs,
    staticMs: 0,
    patchMs,
    totalMs: performance.now() - t0,
    glassCount: g.glassCount,
    patchCount: patches.length,
  }
}

export function stats(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let sum = 0
  let sum2 = 0
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!
    sum += l
    sum2 += l * l
    n++
  }
  const mean = sum / n
  return { w: canvas.width, h: canvas.height, mean: +mean.toFixed(2), std: +Math.sqrt(sum2 / n - mean * mean).toFixed(2) }
}

/** Numeric comparison of two same-size canvases (or of a canvas against a loaded image). */
export function diffStats(a: HTMLCanvasElement, b: HTMLCanvasElement | HTMLImageElement) {
  const w = Math.min(a.width, (b as HTMLCanvasElement).width)
  const h = Math.min(a.height, (b as HTMLCanvasElement).height)
  const da = a.getContext('2d')!.getImageData(0, 0, w, h).data
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tx = tmp.getContext('2d')!
  tx.drawImage(b as CanvasImageSource, 0, 0)
  const db = tx.getImageData(0, 0, w, h).data
  let se = 0
  let ae = 0
  let over = 0
  let n = 0
  for (let i = 0; i < da.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = da[i + c]! - db[i + c]!
      se += d * d
      ae += Math.abs(d)
    }
    const m = (Math.abs(da[i]! - db[i]!) + Math.abs(da[i + 1]! - db[i + 1]!) + Math.abs(da[i + 2]! - db[i + 2]!)) / 3
    if (m > 40)
      over++
    n++
  }
  const mse = se / (n * 3)
  return {
    mse: +mse.toFixed(2),
    psnr: +(mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse)).toFixed(2),
    meanAbsDiff: +(ae / (n * 3)).toFixed(2),
    pctOver40: +((100 * over) / n).toFixed(2),
  }
}

/**
 * Encode a clip straight out of the split pipeline: the static UI raster is
 * prepared once, then every frame re-composites map + glass + patches and is
 * handed to WebCodecs through mediabunny.
 */
export async function encodeClip(opts: {
  frames: number
  fps: number
  bitrate: number
  /** Drives the real replay clock for frame `i`. */
  seekFrame: (i: number) => Promise<void>
  /** Frame index whose composite is also returned as a PNG, for round-trip checks. */
  snapshotFrame?: number
}): Promise<EncodeResult & { staticMs: number, frameMs: number[], patchCounts: number[], snapshot?: { index: number, url: string } }> {
  const staticLayer = await prepareStatic()
  const target = newFrameCanvas()
  const frameMs: number[] = []
  const patchCounts: number[] = []
  let prev = textSnapshot()
  let snapshot: { index: number, url: string } | undefined
  const result = await encodeWebCodecs(target.canvas, {
    fps: opts.fps,
    frames: opts.frames,
    width: target.canvas.width,
    height: target.canvas.height,
    bitrate: opts.bitrate,
    drawFrame: async (i) => {
      await opts.seekFrame(i)
      const f = await composeSplit(staticLayer, prev, target)
      prev = textSnapshot()
      frameMs.push(+f.totalMs.toFixed(2))
      patchCounts.push(f.patchCount)
      if (i === opts.snapshotFrame)
        snapshot = { index: i, url: dataURL(f.canvas) }
    },
  })
  return { ...result, staticMs: +staticLayer.ms.toFixed(1), frameMs, patchCounts, snapshot }
}

;(window as never as Record<string, unknown>).__realBench = {
  findBox,
  rasterFull,
  composeFull,
  prepareStatic,
  composeSplit,
  textSnapshot,
  changedPatches,
  encodeClip,
  stats,
  diffStats,
  decodeFrameAtCanvas,
  dataURL,
  ready: true,
}
