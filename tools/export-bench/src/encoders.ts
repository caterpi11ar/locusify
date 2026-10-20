import { FFmpeg } from '@ffmpeg/ffmpeg'
import { CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, BufferTarget } from 'mediabunny'

export interface EncodeOptions {
  fps: number
  frames: number
  width: number
  height: number
  bitrate: number
  /** Draws frame `i` into the target canvas. */
  drawFrame: (i: number) => Promise<void>
  onProgress?: (done: number, total: number) => void
}

export interface EncodeResult {
  pipeline: string
  container: string
  codec: string
  width: number
  height: number
  frames: number
  fps: number
  bytes: number
  encodeMs: number
  /** Frames per second of wall clock, i.e. how much faster than realtime. */
  framesPerSecond: number
  realtimeFactor: number
  base64: string
  notes: string[]
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let out = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk)
    out += String.fromCharCode(...buf.subarray(i, i + chunk))
  return btoa(out)
}

export function pickRecorderMime(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E',
  ]
  return candidates.find(c => MediaRecorder.isTypeSupported(c)) ?? 'video/webm'
}

/** Baseline: MediaRecorder over canvas.captureStream — realtime bound. */
export async function encodeMediaRecorder(canvas: HTMLCanvasElement, opts: EncodeOptions): Promise<EncodeResult> {
  const mimeType = pickRecorderMime()
  const stream = canvas.captureStream(opts.fps)
  const chunks: Blob[] = []
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: opts.bitrate })
  rec.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)
  const stopped = new Promise<void>(res => (rec.onstop = () => res()))

  rec.start(500)
  const t0 = performance.now()
  for (let i = 0; i < opts.frames; i++) {
    await opts.drawFrame(i)
    opts.onProgress?.(i + 1, opts.frames)
    const target = t0 + ((i + 1) * 1000) / opts.fps
    const wait = target - performance.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
  }
  rec.stop()
  await stopped
  stream.getTracks().forEach(t => t.stop())
  const ms = performance.now() - t0
  const blob = new Blob(chunks, { type: mimeType })
  return {
    pipeline: 'MediaRecorder + canvas.captureStream',
    container: mimeType.includes('mp4') ? 'mp4' : 'webm',
    codec: mimeType,
    width: opts.width,
    height: opts.height,
    frames: opts.frames,
    fps: opts.fps,
    bytes: blob.size,
    encodeMs: ms,
    framesPerSecond: opts.frames / (ms / 1000),
    realtimeFactor: opts.frames / opts.fps / (ms / 1000),
    base64: await toBase64(blob),
    notes: ['Realtime bound: cannot encode faster than playback.'],
  }
}

/** Recommended: WebCodecs (mediabunny CanvasSource) -> MP4, offline speed. */
export async function encodeWebCodecs(canvas: HTMLCanvasElement, opts: EncodeOptions): Promise<EncodeResult> {
  const notes: string[] = []
  let encoderConfig: VideoEncoderConfig | null = null
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: opts.bitrate,
    keyFrameInterval: 2,
    latencyMode: 'quality',
    // Let Chrome choose hardware when it can; fall back to OpenH264 otherwise.
    hardwareAcceleration: 'no-preference',
    onEncoderConfig: (c) => {
      encoderConfig = c
    },
  })
  output.addVideoTrack(source, { frameRate: opts.fps })
  await output.start()

  const t0 = performance.now()
  for (let i = 0; i < opts.frames; i++) {
    await opts.drawFrame(i)
    await source.add(i / opts.fps, 1 / opts.fps)
    opts.onProgress?.(i + 1, opts.frames)
  }
  await output.finalize()
  const ms = performance.now() - t0
  const buffer = (output.target as BufferTarget).buffer
  if (!buffer) throw new Error('mediabunny produced no buffer')
  const blob = new Blob([buffer], { type: 'video/mp4' })
  const cfg = encoderConfig as VideoEncoderConfig | null
  if (cfg) notes.push(`WebCodecs config: ${cfg.codec} @ ${cfg.width}x${cfg.height}, ${Math.round((cfg.bitrate ?? 0) / 1000)} kbps`)
  return {
    pipeline: 'WebCodecs H.264 + mediabunny MP4 mux',
    container: 'mp4',
    codec: cfg?.codec ?? 'avc',
    width: opts.width,
    height: opts.height,
    frames: opts.frames,
    fps: opts.fps,
    bytes: blob.size,
    encodeMs: ms,
    framesPerSecond: opts.frames / (ms / 1000),
    realtimeFactor: opts.frames / opts.fps / (ms / 1000),
    base64: await toBase64(blob),
    notes,
  }
}

/** ffmpeg.wasm (libx264, single-threaded core) fed with JPEG frames. */
export async function encodeFfmpegWasm(
  canvas: HTMLCanvasElement,
  opts: EncodeOptions,
  coreUrls: { coreURL: string, wasmURL: string },
): Promise<EncodeResult> {
  const notes: string[] = []
  const ffmpeg = new FFmpeg()
  const logs: string[] = []
  ffmpeg.on('log', ({ message }) => {
    if (logs.length < 400) logs.push(message)
  })
  await ffmpeg.load({ coreURL: coreUrls.coreURL, wasmURL: coreUrls.wasmURL })
  notes.push('Single-threaded @ffmpeg/core (no SharedArrayBuffer / cross-origin isolation required).')

  const t0 = performance.now()
  const ctx = canvas.getContext('2d')!
  for (let i = 0; i < opts.frames; i++) {
    await opts.drawFrame(i)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95))
    if (!blob) throw new Error('frame encode failed')
    const name = `f${String(i).padStart(3, '0')}.jpg`
    await ffmpeg.writeFile(name, new Uint8Array(await blob.arrayBuffer()))
    opts.onProgress?.(i + 1, opts.frames * 2)
  }
  const extractMs = performance.now() - t0

  const execStart = performance.now()
  await ffmpeg.exec([
    '-hide_banner',
    '-framerate', String(opts.fps),
    '-i', 'f%03d.jpg',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'out.mp4',
  ])
  const execMs = performance.now() - execStart
  const data = await ffmpeg.readFile('out.mp4')
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' })
  const ms = performance.now() - t0
  const version = logs.find(l => l.includes('ffmpeg version'))
  if (version) notes.push(version.trim())
  notes.push(`Frame extraction (JPEG q95 + FS write): ${Math.round(extractMs)} ms`)
  notes.push(`ffmpeg exec: ${Math.round(execMs)} ms`)
  return {
    pipeline: 'ffmpeg.wasm libx264',
    container: 'mp4',
    codec: 'avc1 (libx264)',
    width: opts.width,
    height: opts.height,
    frames: opts.frames,
    fps: opts.fps,
    bytes: blob.size,
    encodeMs: ms,
    framesPerSecond: opts.frames / (ms / 1000),
    realtimeFactor: opts.frames / opts.fps / (ms / 1000),
    base64: await toBase64(blob),
    notes,
  }
}

/** Decodes one frame out of an encoded file for the visual-diff figures. */
/**
 * Pulls the frame at `time` out of an encoded file.
 *
 * Seeking is not usable as a primitive here: MediaRecorder WebM carries no
 * cues/index, so `currentTime` silently lands on frame 0. Playback with
 * `requestVideoFrameCallback` is the only path that works for every container.
 */
export async function decodeFrameAt(blob: Blob, time: number): Promise<string> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.style.cssText = 'position:fixed;left:-4000px;top:0;width:2px;height:2px'
  document.body.appendChild(video)
  try {
    video.src = url
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res()
      video.onerror = () => rej(new Error('video decode failed'))
      setTimeout(() => rej(new Error('video load timeout')), 15000)
    })
    const target = Math.min(time, Math.max(0, (video.duration || 0) - 0.05))
    await new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error('video playback timeout')), 30000)
      const onFrame: VideoFrameRequestCallback = (_now, meta) => {
        if (meta.mediaTime + 1e-3 < target) {
          video.requestVideoFrameCallback(onFrame)
          return
        }
        video.pause()
        clearTimeout(timer)
        res()
      }
      video.requestVideoFrameCallback(onFrame)
      video.play().catch(rej)
    })
    const c = document.createElement('canvas')
    c.width = video.videoWidth
    c.height = video.videoHeight
    c.getContext('2d')!.drawImage(video, 0, 0)
    return c.toDataURL('image/png')
  }
  finally {
    video.remove()
    URL.revokeObjectURL(url)
  }
}
