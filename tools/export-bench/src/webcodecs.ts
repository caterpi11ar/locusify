import { BufferTarget, CanvasSource, Mp4OutputFormat, Output } from 'mediabunny'

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

export async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let out = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk)
    out += String.fromCharCode(...buf.subarray(i, i + chunk))
  return btoa(out)
}

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
  if (!buffer)
    throw new Error('mediabunny produced no buffer')
  const blob = new Blob([buffer], { type: 'video/mp4' })
  const cfg = encoderConfig as VideoEncoderConfig | null
  if (cfg)
    notes.push(`WebCodecs config: ${cfg.codec} @ ${cfg.width}x${cfg.height}, ${Math.round((cfg.bitrate ?? 0) / 1000)} kbps`)
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
