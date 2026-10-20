import './bench.css'
import { composeFrame, snapshotOverlays, snapshotPatches, type OverlayBitmaps } from './composite'
import { decodeFrameAt, encodeFfmpegWasm, encodeMediaRecorder, encodeWebCodecs, pickRecorderMime } from './encoders'
import { DURATION, FPS, HEIGHT, Scene, WIDTH } from './scene'
import { toBlobURL } from '@ffmpeg/util'

// Copied from node_modules/@ffmpeg/core/dist/esm by run.mjs (see README).
// Blob URLs keep Vite from trying to transform the emscripten glue module,
// which the ffmpeg worker dynamic-imports.
let ffmpegCore: { coreURL: string, wasmURL: string } | null = null
async function ffmpegUrls() {
  if (!ffmpegCore) {
    ffmpegCore = {
      coreURL: await toBlobURL('/ffmpeg-core/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg-core/ffmpeg-core.wasm', 'application/wasm'),
    }
  }
  return ffmpegCore
}

const app = document.querySelector('#app') as HTMLElement
const scene = new Scene(app)
const fullCanvas = document.createElement('canvas')
fullCanvas.width = WIDTH
fullCanvas.height = HEIGHT
const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: false })!

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)]! : 0
}
const round = (v: number) => Math.round(v * 100) / 100

let bitmaps: OverlayBitmaps | null = null
let patchCache: { stats: HTMLCanvasElement, bar: HTMLCanvasElement, ms: number } | null = null

const nextRaf = () => new Promise<void>(r => requestAnimationFrame(() => r()))

async function ensureBitmaps(): Promise<OverlayBitmaps> {
  if (!bitmaps) bitmaps = await snapshotOverlays(scene)
  return bitmaps
}

async function drawComposedFrame(t: number, target: HTMLCanvasElement): Promise<void> {
  const b = await ensureBitmaps()
  await scene.renderAt(t)
  patchCache = await snapshotPatches(scene, b)
  composeFrame(fullCtx, { mapCanvas: scene.canvas, bitmaps: b, scene, glass: true, patches: patchCache })
  const ctx = target.getContext('2d')!
  ctx.drawImage(fullCanvas, 0, 0, target.width, target.height)
}

interface Probe {
  userAgent: string
  chromeVersion: string
  apis: Record<string, boolean>
  encoderConfigs: Record<string, string>
  recorderMime: string
  crossOriginIsolated: boolean
  hardwareConcurrency: number
  deviceMemoryGb: number | null
}

async function probe(): Promise<Probe> {
  const apis: Record<string, boolean> = {
    getDisplayMedia: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
    cropTarget: typeof (window as never as { CropTarget?: unknown }).CropTarget !== 'undefined',
    restrictionTarget: typeof (window as never as { RestrictionTarget?: unknown }).RestrictionTarget !== 'undefined',
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    videoEncoder: typeof VideoEncoder !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    canvasFilter: 'filter' in (document.createElement('canvas').getContext('2d') as object),
    webgl2: !!document.createElement('canvas').getContext('webgl2'),
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  }
  const configs: Record<string, string> = {}
  if (typeof VideoEncoder !== 'undefined') {
    const cases: [string, VideoEncoderConfig][] = [
      ['avc1.42001f 1080p', { codec: 'avc1.42001f', width: 1920, height: 1080, bitrate: 12_000_000, framerate: 30 }],
      ['avc1.640028 1080p', { codec: 'avc1.640028', width: 1920, height: 1080, bitrate: 12_000_000, framerate: 30 }],
      ['vp09.00.10.08 1080p', { codec: 'vp09.00.10.08', width: 1920, height: 1080, bitrate: 12_000_000, framerate: 30 }],
      ['vp8 1080p', { codec: 'vp8', width: 1920, height: 1080, bitrate: 12_000_000, framerate: 30 }],
    ]
    for (const [name, config] of cases) {
      try {
        const res = await VideoEncoder.isConfigSupported(config)
        configs[name] = res.supported ? `supported (${res.config?.hardwareAcceleration ?? 'no-preference'})` : 'unsupported'
      }
      catch (e) {
        configs[name] = `error: ${String(e)}`
      }
    }
  }
  return {
    userAgent: navigator.userAgent,
    chromeVersion: await (async () => {
      const uaData = (navigator as never as { userAgentData?: { getHighEntropyValues: (k: string[]) => Promise<{ fullVersionList?: { brand: string, version: string }[] }> } }).userAgentData
      if (!uaData) return /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? 'unknown'
      const v = await uaData.getHighEntropyValues(['fullVersionList'])
      return v.fullVersionList?.find(b => b.brand === 'Google Chrome')?.version ?? 'unknown'
    })(),
    apis,
    encoderConfigs: configs,
    recorderMime: pickRecorderMime(),
    crossOriginIsolated: window.crossOriginIsolated,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGb: (navigator as never as { deviceMemory?: number }).deviceMemory ?? null,
  }
}

/** Snapshot costs: full overlay / photo / pin, repeated to see steady-state. */
async function benchSnapshots() {
  const runs: { overlay: number, photo: number, pin: number, total: number }[] = []
  for (let i = 0; i < 3; i++) {
    const b = await snapshotOverlays(scene)
    runs.push({ overlay: b.overlay.ms, photo: b.photo.ms, pin: b.pin.ms, total: b.totalMs })
    bitmaps = b
  }
  const patchRuns: number[] = []
  const b = await ensureBitmaps()
  for (let i = 0; i < 5; i++) {
    scene.setState(2 + i * 0.3)
    await nextRaf()
    const p = await snapshotPatches(scene, b)
    patchRuns.push(p.ms)
  }
  return {
    cold: runs[0]!,
    steady: {
      overlay: round(median(runs.slice(1).map(r => r.overlay))),
      photo: round(median(runs.slice(1).map(r => r.photo))),
      pin: round(median(runs.slice(1).map(r => r.pin))),
      total: round(median(runs.slice(1).map(r => r.total))),
    },
    patchesMs: round(median(patchRuns)),
  }
}

/** Per-frame compositing cost for the hybrid pipeline and the naive one. */
async function benchCompose(hybridFrames = 45, naiveFrames = 12) {
  const b = await ensureBitmaps()
  const hybrid: { map: number, patch: number, compose: number, total: number }[] = []
  for (let i = 0; i < hybridFrames; i++) {
    const t0 = performance.now()
    await scene.renderAt(i / FPS)
    const t1 = performance.now()
    const patches = await snapshotPatches(scene, b)
    const t2 = performance.now()
    composeFrame(fullCtx, { mapCanvas: scene.canvas, bitmaps: b, scene, glass: true, patches })
    fullCtx.getImageData(0, 0, 1, 1)
    const t3 = performance.now()
    hybrid.push({ map: t1 - t0, patch: t2 - t1, compose: t3 - t2, total: t3 - t0 })
  }

  const naive: { snapshot: number, compose: number, total: number }[] = []
  for (let i = 0; i < naiveFrames; i++) {
    const t0 = performance.now()
    await scene.renderAt(i / FPS)
    const t1 = performance.now()
    const overlay = await snapshotOverlays(scene)
    const t2 = performance.now()
    composeFrame(fullCtx, {
      mapCanvas: scene.canvas,
      bitmaps: overlay,
      scene,
      glass: false,
      naive: { overlay: overlay.overlay.canvas, photo: overlay.photo.canvas, pin: overlay.pin.canvas },
    })
    fullCtx.getImageData(0, 0, 1, 1)
    const t3 = performance.now()
    naive.push({ snapshot: t2 - t1, compose: t3 - t2, total: t3 - t0 })
    bitmaps = null
  }
  bitmaps = await snapshotOverlays(scene)

  const pick = <K extends string>(rows: Record<K, number>[], k: K) => round(median(rows.map(r => r[k])))
  return {
    hybrid: {
      mapRenderMs: pick(hybrid, 'map'),
      patchSnapshotMs: pick(hybrid, 'patch'),
      composeMs: pick(hybrid, 'compose'),
      totalMs: pick(hybrid, 'total'),
      achievableFps: round(1000 / Math.max(1, pick(hybrid, 'total'))),
    },
    naive: {
      snapshotMs: pick(naive, 'snapshot'),
      composeMs: pick(naive, 'compose'),
      totalMs: pick(naive, 'total'),
      achievableFps: round(1000 / Math.max(1, pick(naive, 'total'))),
    },
  }
}

async function compositesAt(times: number[], glass = true) {
  const b = await ensureBitmaps()
  const out: { t: number, png: string, ms: number }[] = []
  for (const t of times) {
    const t0 = performance.now()
    await scene.renderAt(t)
    const patches = await snapshotPatches(scene, b)
    composeFrame(fullCtx, { mapCanvas: scene.canvas, bitmaps: b, scene, glass, patches })
    const png = fullCanvas.toDataURL('image/png')
    out.push({ t, png, ms: performance.now() - t0 })
  }
  return out
}

/** Composite without glass emulation, for the backdrop-filter figure. */
async function compositeNoGlass(t: number) {
  const b = await ensureBitmaps()
  await scene.renderAt(t)
  const patches = await snapshotPatches(scene, b)
  composeFrame(fullCtx, { mapCanvas: scene.canvas, bitmaps: b, scene, glass: false, patches })
  return { png: fullCanvas.toDataURL('image/png'), statsRect: b.statsCardRect }
}

async function runEncoders(opts: { webCodecsFrames: number, recorderFrames: number, ffmpegFrames: number }) {
  const results: Record<string, unknown> = {}
  const run = async (kind: 'webcodecs' | 'recorder' | 'ffmpeg', frames: number, size = { w: WIDTH, h: HEIGHT }) => {
    const canvas = document.createElement('canvas')
    canvas.width = size.w
    canvas.height = size.h
    const encodeOpts = {
      fps: FPS,
      frames,
      width: size.w,
      height: size.h,
      bitrate: size.w >= 1920 ? 16_000_000 : 8_000_000,
      drawFrame: (i: number) => drawComposedFrame(i / FPS, canvas),
      onProgress: (done: number, total: number) => {
        const el = document.querySelector('#bench-ui')
        if (el) el.textContent = `${kind}: ${done}/${total}`
      },
    }
    if (kind === 'webcodecs') return encodeWebCodecs(canvas, encodeOpts)
    if (kind === 'recorder') return encodeMediaRecorder(canvas, encodeOpts)
    return encodeFfmpegWasm(canvas, encodeOpts, await ffmpegUrls())
  }

  // Warm caches so the first encode does not pay for html-to-image cold start.
  await ensureBitmaps()
  const t0 = performance.now()
  results.webcodecs = await run('webcodecs', opts.webCodecsFrames)
  results.webcodecsTotalMs = performance.now() - t0

  results.recorder = await run('recorder', opts.recorderFrames)
  results.ffmpeg = await run('ffmpeg', opts.ffmpegFrames)
  return results
}

async function decodeFrames(entries: { key: string, base64: string, time: number }[]) {
  const out: Record<string, string> = {}
  for (const e of entries) {
    const bytes = Uint8Array.from(atob(e.base64), c => c.charCodeAt(0))
    out[e.key] = await decodeFrameAt(new Blob([bytes]), e.time)
  }
  return out
}

async function init() {
  document.fonts && (await document.fonts.ready)
  await scene.init()
  await ensureBitmaps()

  ;(window as never as { __bench: unknown }).__bench = {
    probe,
    benchSnapshots,
    benchCompose,
    compositesAt,
    compositeNoGlass,
    runEncoders,
    decodeFrames,
    setDomTime: async (t: number) => {
      scene.setState(t)
      await scene.renderMap()
      await nextRaf()
      await nextRaf()
    },
    constants: { WIDTH, HEIGHT, FPS, DURATION },
    ready: true,
  }
}

const readyPromise = init().catch((e) => {
  console.error(e)
  ;(window as never as { __bench: unknown }).__bench = { ready: false, error: String(e?.stack ?? e) }
})

void readyPromise
