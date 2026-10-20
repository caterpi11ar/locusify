import type { EncodeOptions, EncodeResult } from './webcodecs'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { decodeFrameAtCanvas } from './decode'
import { toBase64 } from './webcodecs'

export type { EncodeOptions, EncodeResult } from './webcodecs'
export { encodeWebCodecs } from './webcodecs'

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
    if (wait > 0)
      await new Promise(r => setTimeout(r, wait))
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
    if (logs.length < 400)
      logs.push(message)
  })
  await ffmpeg.load({ coreURL: coreUrls.coreURL, wasmURL: coreUrls.wasmURL })
  notes.push('Single-threaded @ffmpeg/core (no SharedArrayBuffer / cross-origin isolation required).')

  const t0 = performance.now()
  for (let i = 0; i < opts.frames; i++) {
    await opts.drawFrame(i)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95))
    if (!blob)
      throw new Error('frame encode failed')
    const name = `f${String(i).padStart(3, '0')}.jpg`
    await ffmpeg.writeFile(name, new Uint8Array(await blob.arrayBuffer()))
    opts.onProgress?.(i + 1, opts.frames * 2)
  }
  const extractMs = performance.now() - t0

  const execStart = performance.now()
  await ffmpeg.exec([
    '-hide_banner',
    '-framerate',
    String(opts.fps),
    '-i',
    'f%03d.jpg',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'out.mp4',
  ])
  const execMs = performance.now() - execStart
  const data = await ffmpeg.readFile('out.mp4')
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' })
  const ms = performance.now() - t0
  const version = logs.find(l => l.includes('ffmpeg version'))
  if (version)
    notes.push(version.trim())
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
  const canvas = await decodeFrameAtCanvas(blob, time)
  return canvas.toDataURL('image/png')
}
