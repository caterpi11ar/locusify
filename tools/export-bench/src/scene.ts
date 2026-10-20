import type { Map as MLMap } from 'maplibre-gl'
import { setWorkerUrl } from 'maplibre-gl'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// Same workaround as packages/app/src/lib/maplibre-worker.ts: v6 resolves its
// worker relative to import.meta.url, which the bundler breaks.
setWorkerUrl(workerUrl)
import darkStyle from '../../../packages/app/src/pages/map/MapLibreStyleDark.json'

export const WIDTH = 1920
export const HEIGHT = 1080
export const FPS = 30
export const DURATION = 10

type LngLat = [number, number]

/** Iceland ring road-ish polyline — enough geometry to exercise line rendering. */
const ROUTE: LngLat[] = [
  [-21.94, 64.15],
  [-21.3, 64.4],
  [-20.5, 64.55],
  [-19.6, 64.5],
  [-18.9, 64.3],
  [-18.3, 64.0],
  [-17.3, 63.9],
  [-16.2, 63.9],
  [-15.2, 64.0],
  [-14.6, 64.3],
  [-14.8, 64.9],
  [-15.6, 65.2],
  [-16.9, 65.4],
  [-17.8, 65.6],
  [-18.9, 65.4],
  [-20.0, 65.1],
  [-20.8, 64.8],
  [-21.5, 64.5],
  [-21.94, 64.15],
]

const CAMERA = [
  { t: 0, center: [-19.2, 64.9] as LngLat, zoom: 5.35, bearing: 0, pitch: 0 },
  { t: 5, center: [-17.6, 64.7] as LngLat, zoom: 6.15, bearing: -10, pitch: 16 },
  { t: 10, center: [-16.2, 64.75] as LngLat, zoom: 7.0, bearing: -22, pitch: 26 },
]

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function cameraAt(t: number) {
  const k = clamp01(t / DURATION) * (CAMERA.length - 1)
  const i = Math.min(CAMERA.length - 2, Math.floor(k))
  const f = k - i
  const a = CAMERA[i]!
  const b = CAMERA[i + 1]!
  return {
    center: [lerp(a.center[0], b.center[0], f), lerp(a.center[1], b.center[1], f)] as LngLat,
    zoom: lerp(a.zoom, b.zoom, f),
    bearing: lerp(a.bearing, b.bearing, f),
    pitch: lerp(a.pitch, b.pitch, f),
  }
}

/** Distance-parameterised route so progress maps to equal travel, not equal vertices. */
const SEGMENTS = (() => {
  const segs: { from: LngLat, to: LngLat, len: number }[] = []
  let total = 0
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const from = ROUTE[i]!
    const to = ROUTE[i + 1]!
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    segs.push({ from, to, len })
    total += len
  }
  return { segs, total }
})()

function routeAt(progress: number): { travelled: LngLat[], head: LngLat } {
  const target = SEGMENTS.total * clamp01(progress)
  const travelled: LngLat[] = [ROUTE[0]!]
  let acc = 0
  let head: LngLat = ROUTE[0]!
  for (const seg of SEGMENTS.segs) {
    if (acc + seg.len <= target) {
      travelled.push(seg.to)
      acc += seg.len
      head = seg.to
    }
    else {
      const f = seg.len === 0 ? 0 : (target - acc) / seg.len
      head = [lerp(seg.from[0], seg.to[0], f), lerp(seg.from[1], seg.to[1], f)]
      travelled.push(head)
      break
    }
  }
  return { travelled, head }
}

/**
 * Generates a photo at exactly the box it will be shown in. Production images
 * should be pre-scaled/cropped the same way: html-to-image renders `object-fit`
 * incorrectly inside <foreignObject>, and pre-cropping sidesteps that.
 */
function makePhotoDataUrl(width: number, height: number): string {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const k = width / 780
  const ctx = c.getContext('2d')!
  ctx.scale(k, height / 980)
  const sky = ctx.createLinearGradient(0, 0, 0, 980)
  sky.addColorStop(0, '#1b2a45')
  sky.addColorStop(0.45, '#7a5d7a')
  sky.addColorStop(0.62, '#e8945a')
  sky.addColorStop(1, '#12161f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 780, 980)

  // sun
  const sun = ctx.createRadialGradient(560, 470, 10, 560, 470, 180)
  sun.addColorStop(0, 'rgba(255,236,200,0.95)')
  sun.addColorStop(1, 'rgba(255,200,140,0)')
  ctx.fillStyle = sun
  ctx.fillRect(300, 250, 520, 460)

  // mountain silhouettes
  const ridge = (points: [number, number][], fill: string) => {
    ctx.beginPath()
    ctx.moveTo(0, points[0]![1])
    for (const [x, y] of points) ctx.lineTo(x, y)
    ctx.lineTo(780, 980)
    ctx.lineTo(0, 980)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  ridge([[0, 620], [120, 540], [240, 600], [360, 500], [520, 590], [660, 520], [780, 610]], 'rgba(18,22,32,0.92)')
  ridge([[0, 700], [160, 640], [300, 690], [470, 610], [640, 700], [780, 650]], 'rgba(10,13,20,0.95)')

  // water reflection + fine noise so PSNR is meaningful
  ctx.fillStyle = 'rgba(150,170,200,0.10)'
  for (let i = 0; i < 260; i++) {
    const y = 760 + Math.random() * 220
    const w = 20 + Math.random() * 160
    ctx.fillRect(Math.random() * 780, y, w, 2)
  }
  // film grain (in device pixels, ignoring the scale transform)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const img = ctx.getImageData(0, 0, width, height)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14
    img.data[i] = Math.min(255, Math.max(0, img.data[i]! + n))
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1]! + n))
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2]! + n))
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/jpeg', 0.9)
}

const nextRender = (map: MLMap) =>
  new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    map.once('render', finish)
    map.triggerRepaint()
    setTimeout(finish, 400)
  })

export class Scene {
  readonly stage: HTMLDivElement
  readonly mapEl: HTMLDivElement
  readonly overlay: HTMLDivElement
  readonly vignette: HTMLDivElement
  readonly photoCard: HTMLDivElement
  readonly pin: HTMLDivElement
  readonly statsValues: HTMLDivElement
  readonly barDynamic: HTMLDivElement
  readonly statsCard: HTMLDivElement
  readonly bottomBar: HTMLDivElement
  map!: MLMap
  private readonly photoUrl = makePhotoDataUrl(520, 640)
  private readonly pinUrl = makePhotoDataUrl(92, 92)
  private routeProgress = 0
  private time = 0
  pinX = 0
  pinY = 0

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div id="stage">
        <div id="map"></div>
        <div id="vignette"></div>
        <div id="overlay">
          <div class="title-block">
            <h1>Iceland · Ring Road</h1>
            <p>Sep 12 — Sep 19, 2026</p>
          </div>
          <div class="stats-card" id="stats-card">
            <div class="stats-head">Trip summary</div>
            <div class="stats-values" id="stats-values">
              <div class="stat"><b id="v-days">1</b><span>days</span></div>
              <div class="stat"><b id="v-km">0</b><span>km</span></div>
              <div class="stat"><b id="v-photos">0</b><span>photos</span></div>
            </div>
            <div class="stats-foot">Reykjavík → Vík → Egilsstaðir</div>
          </div>
          <div id="bottom-bar">
            <div class="brand">
              <div class="brand-logo"></div>
              <div class="brand-name">Locusify</div>
            </div>
            <div class="bar-stats" id="bar-dynamic">
              <div class="bar-stat"><b id="b-days">1</b><span>days</span></div>
              <div class="bar-stat"><b id="b-km">0.00</b><span>km</span></div>
            </div>
          </div>
          <div id="watermark">Powered by Locusify</div>
        </div>
        <div id="photo-card">
          <img alt="" src="${this.photoUrl}" />
          <div class="photo-caption">
            <b>Seljalandsfoss</b>
            Shot at 18:42 · 63.6156° N, 19.9886° W
          </div>
        </div>
        <div id="pin">
          <div class="pin-photo"><img alt="" src="${this.pinUrl}" /></div>
          <div class="photo-tag">Seljalandsfoss</div>
        </div>
        <div id="bench-ui"></div>
      </div>
    `
    this.stage = root.querySelector('#stage') as HTMLDivElement
    this.mapEl = root.querySelector('#map') as HTMLDivElement
    this.vignette = root.querySelector('#vignette') as HTMLDivElement
    this.overlay = root.querySelector('#overlay') as HTMLDivElement
    this.photoCard = root.querySelector('#photo-card') as HTMLDivElement
    this.pin = root.querySelector('#pin') as HTMLDivElement
    this.statsValues = root.querySelector('#stats-values') as HTMLDivElement
    this.barDynamic = root.querySelector('#bar-dynamic') as HTMLDivElement
    this.statsCard = root.querySelector('#stats-card') as HTMLDivElement
    this.bottomBar = root.querySelector('#bottom-bar') as HTMLDivElement
    this.statsValues.classList.add('dynamic')
    this.barDynamic.classList.add('dynamic')
  }

  async init(): Promise<void> {
    this.map = new maplibregl.Map({
      container: this.mapEl,
      style: darkStyle as never,
      center: cameraAt(0).center,
      zoom: cameraAt(0).zoom,
      interactive: false,
      attributionControl: false,
      // MapLibre v6 moved preserveDrawingBuffer into canvasContextAttributes.
      // Without it, reading the WebGL canvas outside the render task yields
      // transparent black — the intermittent "black map" export bug.
      canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
      pixelRatio: 1,
      fadeDuration: 0,
      refreshExpiredTiles: false,
    })

    await new Promise<void>((resolve, reject) => {
      this.map.once('load', () => resolve())
      this.map.once('error', e => reject(new Error(`map style error: ${String(e?.error ?? e)}`)))
      setTimeout(() => reject(new Error('map load timeout')), 30000)
    })

    this.map.addSource('route-full', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ROUTE } },
    })
    this.map.addLayer({
      id: 'route-full',
      type: 'line',
      source: 'route-full',
      paint: { 'line-color': '#7c5cff', 'line-width': 7, 'line-opacity': 0.28, 'line-blur': 2 },
    })
    this.map.addSource('route-travelled', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [ROUTE[0]!, ROUTE[0]!] } },
    })
    this.map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route-travelled',
      paint: { 'line-color': '#ff8a4c', 'line-width': 22, 'line-opacity': 0.25, 'line-blur': 18 },
    })
    this.map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route-travelled',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffd9a8', 'line-width': 6.5 },
    })

    // Warm the tile cache and font glyphs across the whole camera path so the
    // timed runs below are not dominated by network fetches.
    for (const key of CAMERA) {
      this.map.jumpTo({ center: key.center, zoom: key.zoom, bearing: key.bearing, pitch: key.pitch })
      this.map.triggerRepaint()
      await new Promise(r => setTimeout(r, 350))
    }
    this.setState(0)
    this.map.triggerRepaint()
    await new Promise(r => setTimeout(r, 600))
  }

  /** Updates every animated property to its value at `t` seconds. */
  setState(t: number): void {
    this.time = t
    const cam = cameraAt(t)
    this.map.jumpTo({ center: cam.center, zoom: cam.zoom, bearing: cam.bearing, pitch: cam.pitch })

    const progress = clamp01(t / (DURATION - 0.6))
    this.routeProgress = progress
    const { travelled, head } = routeAt(progress)
    const src = this.map.getSource('route-travelled') as maplibregl.GeoJSONSource | undefined
    src?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: travelled } })

    // Stats count up; the photo card slides in at t≈2.4s; the pin rides the head.
    const days = Math.max(1, Math.round(lerp(1, 8, progress)))
    const km = Math.round(lerp(0, 1482, progress))
    const photos = Math.round(lerp(0, 42, progress))
    const setText = (id: string, v: string) => {
      const el = document.getElementById(id)
      if (el && el.textContent !== v) el.textContent = v
    }
    setText('v-days', String(days))
    setText('v-km', km.toLocaleString('en-US'))
    setText('v-photos', String(photos))
    setText('b-days', String(Math.floor(lerp(1, 8, progress))))
    setText('b-km', lerp(0, 1482, progress).toFixed(2))

    const slide = clamp01((t - 2.2) / 0.9)
    const ease = 1 - (1 - slide) ** 3
    this.photoCard.style.transform = `translate3d(${(1 - ease) * 140}px, 0, 0) scale(${0.94 + 0.06 * ease})`
    this.photoCard.style.opacity = String(ease)

    // Pin position: MapLibre DOM markers use project() on every render.
    const p = this.map.project(head)
    // #pin is 300x92 with the 92px circular thumb at its top-left corner.
    this.pin.style.transform = `translate3d(${p.x - 46}px, ${p.y - 46}px, 0)`
    this.pinX = p.x - 46
    this.pinY = p.y - 46
  }

  /** Renders the map at the current state and resolves when a frame is available. */
  async renderMap(): Promise<void> {
    await nextRender(this.map)
  }

  async renderAt(t: number): Promise<void> {
    this.setState(t)
    await this.renderMap()
  }

  get canvas(): HTMLCanvasElement {
    return this.map.getCanvas()
  }

  get routeHead(): LngLat {
    return routeAt(this.routeProgress).head
  }

  get currentTime(): number {
    return this.time
  }
}
