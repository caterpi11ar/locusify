import {
  BufferTarget,
  canEncodeVideo,
  CanvasSource,
  Mp4OutputFormat,
  Output,
} from 'mediabunny'
import { useCallback, useEffect, useRef, useState } from 'react'
import locusifyLogoUrl from '@/assets/locusify-fit.png'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { useMapStore } from '@/stores/mapStore'
import { useReplayStore } from '@/stores/replayStore'

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'unsupported'

// ─── Image cache ───────────────────────────────────────────────────────────────

const imageCache = new Map<string, HTMLImageElement>()

function loadImage(url: string): void {
  if (imageCache.has(url))
    return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => imageCache.set(url, img)
  img.src = url
}

// Eagerly load the logo so it's ready when recording starts
loadImage(locusifyLogoUrl)

// ─── Capability detection ──────────────────────────────────────────────────────

type RecordingCapability
  = | { type: 'mp4' }
    | { type: 'webm', mimeType: string }
    | { type: 'unsupported' }

async function detectCapability(): Promise<RecordingCapability> {
  // Prefer H.264 via WebCodecs — produces native MP4 playable on iOS/Android
  try {
    if (await canEncodeVideo('avc')) {
      return { type: 'mp4' }
    }
  }
  catch { /* fall through */ }

  // Fallback: MediaRecorder WebM (desktop Chrome/Firefox, Android Chrome)
  if (typeof MediaRecorder !== 'undefined') {
    const canvas = document.createElement('canvas')
    if (typeof canvas.captureStream === 'function') {
      const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t))
      if (mimeType)
        return { type: 'webm', mimeType }
    }
  }

  return { type: 'unsupported' }
}

// ─── Canvas drawing helpers ────────────────────────────────────────────────────

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth)
    return text
  let result = text
  while (result.length > 0 && ctx.measureText(`${result}…`).width > maxWidth)
    result = result.slice(0, -1)
  return `${result}…`
}

// ─── Frame drawing functions ───────────────────────────────────────────────────

const FADE_IN_MS = 700
const HOLD_MS = 1400
const FADE_OUT_MS = 700
const INTRO_MS = FADE_IN_MS + HOLD_MS + FADE_OUT_MS // 2800ms total

/**
 * Draws the opening Locusify logo animation onto the composite canvas.
 * Returns false once the intro has finished (elapsed >= INTRO_MS).
 */
function drawIntro(ctx: CanvasRenderingContext2D, W: number, H: number, elapsed: number): boolean {
  if (elapsed >= INTRO_MS)
    return false

  let alpha: number
  if (elapsed < FADE_IN_MS) {
    alpha = elapsed / FADE_IN_MS
  }
  else if (elapsed < FADE_IN_MS + HOLD_MS) {
    alpha = 1
  }
  else {
    alpha = 1 - (elapsed - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS
  }

  ctx.save()

  ctx.globalAlpha = alpha * 0.92
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const logoImg = imageCache.get(locusifyLogoUrl)
  const logoSize = Math.max(24, Math.round(W * 0.038))
  const imgSize = Math.max(64, Math.round(W * 0.09))
  const gap = Math.round(imgSize * 0.3)
  const totalH = imgSize + gap + logoSize + Math.round(logoSize * 1.6)
  const blockTop = H / 2 - totalH / 2

  if (logoImg) {
    const r = Math.max(8, Math.round(imgSize * 0.18))
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(W / 2 - imgSize / 2, blockTop, imgSize, imgSize, r)
    ctx.clip()
    ctx.drawImage(logoImg, W / 2 - imgSize / 2, blockTop, imgSize, imgSize)
    ctx.restore()
  }

  ctx.font = `700 ${logoSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Locusify', W / 2, blockTop + imgSize + gap + logoSize / 2)

  const subSize = Math.max(11, Math.round(W * 0.013))
  ctx.font = `400 ${subSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText('Your Journey, Mapped', W / 2, blockTop + imgSize + gap + logoSize + Math.round(logoSize * 0.9))

  ctx.restore()
  return true
}

function drawPhotoCard(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const { waypoints, currentWaypointIndex } = useReplayStore.getState()
  const waypoint = waypoints[currentWaypointIndex]
  if (!waypoint)
    return

  const { marker } = waypoint
  const { photo } = marker

  if (photo.thumbnailUrl)
    loadImage(photo.thumbnailUrl)

  const MARGIN = Math.max(12, Math.round(W * 0.020))
  // Portrait-aware card width: take the smaller of 38% of width or 45% of height,
  // so the card is proportionally large on both portrait mobile and landscape desktop.
  const CARD_W = Math.min(Math.round(W * 0.38), Math.round(H * 0.45))
  const PHOTO_H = Math.round(CARD_W * 0.68)
  // Font sizes relative to card width so they scale with the card on all aspect ratios.
  const FONT_TITLE = Math.max(13, Math.round(CARD_W * 0.062))
  const FONT_META = Math.max(10, Math.round(CARD_W * 0.048))
  const LINE_H = Math.round(FONT_TITLE * 1.6)
  const PAD = Math.round(FONT_TITLE * 0.7)
  const INFO_H = PAD * 2 + LINE_H + Math.round(FONT_META * 1.6)
  const CARD_H = PHOTO_H + INFO_H
  const RADIUS = Math.max(8, Math.round(CARD_W * 0.045))

  const cx = W - CARD_W - MARGIN
  const cy = MARGIN

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(cx, cy, CARD_W, CARD_H, RADIUS)
  ctx.clip()
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(cx, cy, CARD_W, CARD_H)

  const img = photo.thumbnailUrl ? imageCache.get(photo.thumbnailUrl) : undefined
  if (img)
    drawImageCover(ctx, img, cx, cy, CARD_W, PHOTO_H)

  const grad = ctx.createLinearGradient(cx, cy + PHOTO_H * 0.4, cx, cy + PHOTO_H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = grad
  ctx.fillRect(cx, cy, CARD_W, PHOTO_H)

  if (photo.dateTaken) {
    const dateStr = formatDate(new Date(photo.dateTaken), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    ctx.font = `${FONT_META}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.textBaseline = 'bottom'
    ctx.fillText(dateStr, cx + PAD, cy + PHOTO_H - PAD)
  }

  ctx.font = `600 ${FONT_TITLE}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.textBaseline = 'top'
  ctx.fillText(
    truncateText(ctx, photo.title || marker.id, CARD_W - PAD * 2),
    cx + PAD,
    cy + PHOTO_H + PAD,
  )

  const coordStr = formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef)
  ctx.font = `${FONT_META}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText(
    truncateText(ctx, coordStr, CARD_W - PAD * 2),
    cx + PAD,
    cy + PHOTO_H + PAD + LINE_H,
  )

  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(cx, cy, CARD_W, CARD_H, RADIUS)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const text = 'Powered by Locusify'
  const fontSize = Math.max(11, Math.round(W * 0.016))
  const logoImg = imageCache.get(locusifyLogoUrl)

  ctx.save()
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

  const paddingX = fontSize * 0.7
  const paddingY = fontSize * 0.5
  const gap = fontSize * 0.5 // gap between logo and text
  const logoSize = fontSize + paddingY * 2 // logo square matches pill height
  const textW = ctx.measureText(text).width
  const pillH = logoSize
  const pillW = (logoImg ? logoSize + gap : 0) + textW + paddingX * 2
  const margin = Math.max(10, W * 0.015)
  const x = W - pillW - margin
  const y = H - pillH - margin
  const r = pillH / 2

  // Background pill
  ctx.globalAlpha = 0.6
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.roundRect(x, y, pillW, pillH, r)
  ctx.fill()

  // Logo image (left side, square, no clipping)
  if (logoImg) {
    ctx.globalAlpha = 1
    ctx.drawImage(logoImg, x, y, logoSize, logoSize)
  }

  // "Powered by Locusify" text
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  const textX = x + (logoImg ? logoSize + gap : paddingX)
  ctx.fillText(text, textX, y + pillH / 2)

  ctx.restore()
}

// ─── Timing constants ──────────────────────────────────────────────────────────

/** How long to keep showing the map after replay ends before the outro. */
const WAIT_MS = 2000

// ─── Shared canvas factory ─────────────────────────────────────────────────────

/**
 * Maximum pixel length on either axis for the recording canvas.
 * 1280px (≈ 720p) balances quality and file size for mobile sharing.
 * Caps high-DPR canvases (e.g. 1170×2532 on iPhone 3× DPR) to a size
 * that iOS/Android VideoEncoder hardware handles reliably.
 */
const MAX_RECORDING_DIMENSION = 1280

/**
 * Creates a 2D composite canvas scaled to fit within MAX_RECORDING_DIMENSION.
 * Dimensions are rounded to even numbers as required by H.264 YUV encoding.
 */
function createCompositeCanvas(mapCanvas: HTMLCanvasElement): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
} {
  const { width: srcW, height: srcH } = mapCanvas
  const scale = Math.min(1, MAX_RECORDING_DIMENSION / Math.max(srcW, srcH))
  const canvas = document.createElement('canvas')
  // H.264 YUV encoding requires even dimensions
  canvas.width = Math.round(srcW * scale) & ~1
  canvas.height = Math.round(srcH * scale) & ~1
  const ctx = canvas.getContext('2d')!
  return { canvas, ctx }
}

// ─── Session callbacks & shared types ─────────────────────────────────────────

interface SessionCallbacks {
  /** Called the moment the session decides to stop (transition to 'processing'). */
  onStopping: () => void
  /** Called once the encoded blob is ready (transition to 'idle'). */
  onComplete: (blob: Blob, mimeType: string) => void
  /** Called if the session fails to initialize (e.g. WebCodecs unavailable at runtime). */
  onError?: () => void
}

// ─── Recording phase ───────────────────────────────────────────────────────────

type RecordingPhase = 'intro' | 'recording' | 'wait'

// ─── Mp4RecordingSession ───────────────────────────────────────────────────────

/**
 * Records the composite canvas to MP4 (H.264) using WebCodecs + Mediabunny.
 * Compatible with iOS Safari 16.4+, Android Chrome, and desktop Chrome/Edge.
 *
 * Phase state machine:
 *   intro → recording → wait (WAIT_MS) → finalize
 *
 * The session self-terminates after the 2s wait completes —
 * no external timer or watcher needed.
 */
class Mp4RecordingSession {
  readonly canvas: HTMLCanvasElement

  private readonly ctx: CanvasRenderingContext2D
  private readonly mapCanvas: HTMLCanvasElement
  private readonly shouldStop: () => boolean
  private readonly callbacks: SessionCallbacks

  private output: Output | null = null
  private videoSource: CanvasSource | null = null
  private bufferTarget: BufferTarget | null = null

  private startTime: number | null = null
  private phase: RecordingPhase = 'intro'
  private phaseStartTimestamp = 0
  private lastFrameElapsed = 0
  private rafId: number | null = null
  private disposed = false

  constructor(
    mapCanvas: HTMLCanvasElement,
    shouldStop: () => boolean,
    callbacks: SessionCallbacks,
  ) {
    this.mapCanvas = mapCanvas
    this.shouldStop = shouldStop
    this.callbacks = callbacks
    const { canvas, ctx } = createCompositeCanvas(mapCanvas)
    this.canvas = canvas
    this.ctx = ctx
  }

  start(): void {
    void this.initAndStart()
  }

  /** Tears down without emitting a blob (user exits replay before saving). */
  dispose(): void {
    this.disposed = true
    this.cancelRaf()
  }

  private finalize(): void {
    const { output, bufferTarget } = this
    if (!output || !bufferTarget || this.disposed)
      return
    void output.finalize().then(() => {
      const { buffer } = bufferTarget
      if (buffer && !this.disposed)
        this.callbacks.onComplete(new Blob([buffer], { type: 'video/mp4' }), 'video/mp4')
    })
  }

  private async initAndStart(): Promise<void> {
    try {
      const bufferTarget = new BufferTarget()
      const output = new Output({ format: new Mp4OutputFormat(), target: bufferTarget })
      const videoSource = new CanvasSource(this.canvas, { codec: 'avc', bitrate: 4_000_000 })
      output.addVideoTrack(videoSource, { frameRate: 30 })
      await output.start()

      if (this.disposed)
        return // user may have exited during async init

      this.output = output
      this.bufferTarget = bufferTarget
      this.videoSource = videoSource
      this.rafId = requestAnimationFrame(this.drawFrame)
    }
    catch {
      if (!this.disposed)
        this.callbacks.onError?.()
    }
  }

  private cancelRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private readonly drawFrame = (timestamp: number): void => {
    if (this.startTime === null)
      this.startTime = timestamp
    const elapsed = timestamp - this.startTime
    // Use composite canvas dimensions (may be scaled down from mapCanvas)
    const { width: W, height: H } = this.canvas

    // Always composite the map frame first (scaled to fit composite canvas)
    this.ctx.drawImage(this.mapCanvas, 0, 0, W, H)

    let done = false

    switch (this.phase) {
      case 'intro': {
        const stillIntro = drawIntro(this.ctx, W, H, elapsed)
        if (!stillIntro)
          this.phase = 'recording'
        break
      }
      case 'recording': {
        drawPhotoCard(this.ctx, W, H)
        drawWatermark(this.ctx, W, H)
        if (this.shouldStop()) {
          this.phase = 'wait'
          this.phaseStartTimestamp = timestamp
        }
        break
      }
      case 'wait': {
        drawPhotoCard(this.ctx, W, H)
        drawWatermark(this.ctx, W, H)
        if (timestamp - this.phaseStartTimestamp >= WAIT_MS)
          done = true
        break
      }
    }

    if (!this.videoSource || this.disposed)
      return

    const t = elapsed / 1000
    const dur = Math.max((elapsed - this.lastFrameElapsed) / 1000, 1 / 60)
    this.lastFrameElapsed = elapsed

    // Encode the current frame; finalise after the last one.
    void this.videoSource.add(t, dur).then(() => {
      if (this.disposed)
        return
      if (done) {
        this.callbacks.onStopping()
        this.finalize()
      }
    })

    if (!done)
      this.rafId = requestAnimationFrame(this.drawFrame)
  }
}

// ─── WebmRecordingSession ──────────────────────────────────────────────────────

/**
 * Records the composite canvas to WebM using the MediaRecorder API.
 * Used as a fallback on browsers without WebCodecs H.264 support (Firefox).
 *
 * Same phase state machine as Mp4RecordingSession:
 *   intro → recording → wait (WAIT_MS) → finalize
 */
class WebmRecordingSession {
  readonly canvas: HTMLCanvasElement

  private readonly ctx: CanvasRenderingContext2D
  private readonly mapCanvas: HTMLCanvasElement
  private readonly recorder: MediaRecorder
  private readonly shouldStop: () => boolean
  private readonly callbacks: SessionCallbacks
  private readonly chunks: Blob[] = []

  private startTime: number | null = null
  private phase: RecordingPhase = 'intro'
  private phaseStartTimestamp = 0
  private rafId: number | null = null
  private disposed = false

  constructor(
    mapCanvas: HTMLCanvasElement,
    mimeType: string,
    shouldStop: () => boolean,
    callbacks: SessionCallbacks,
  ) {
    this.mapCanvas = mapCanvas
    this.shouldStop = shouldStop
    this.callbacks = callbacks
    const { canvas, ctx } = createCompositeCanvas(mapCanvas)
    this.canvas = canvas
    this.ctx = ctx

    const stream = canvas.captureStream(30)
    this.recorder = new MediaRecorder(stream, { mimeType })

    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0)
        this.chunks.push(e.data)
    }

    this.recorder.onstop = () => {
      this.cancelRaf()
      if (!this.disposed)
        callbacks.onComplete(new Blob(this.chunks, { type: mimeType }), mimeType)
    }
  }

  start(): void {
    this.rafId = requestAnimationFrame(this.drawFrame)
    this.recorder.start()
  }

  dispose(): void {
    this.disposed = true
    this.cancelRaf()
    if (this.recorder.state !== 'inactive')
      this.recorder.stop()
  }

  private stopRecorder(): void {
    if (this.recorder.state === 'inactive')
      return
    try {
      this.recorder.requestData()
    }
    catch { /* no-op */ }
    this.recorder.stop()
  }

  private cancelRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private readonly drawFrame = (timestamp: number): void => {
    if (this.startTime === null)
      this.startTime = timestamp
    const elapsed = timestamp - this.startTime
    // Use composite canvas dimensions (may be scaled down from mapCanvas)
    const { width: W, height: H } = this.canvas

    this.ctx.drawImage(this.mapCanvas, 0, 0, W, H)

    let done = false

    switch (this.phase) {
      case 'intro': {
        const stillIntro = drawIntro(this.ctx, W, H, elapsed)
        if (!stillIntro)
          this.phase = 'recording'
        break
      }
      case 'recording': {
        drawPhotoCard(this.ctx, W, H)
        drawWatermark(this.ctx, W, H)
        if (this.shouldStop()) {
          this.phase = 'wait'
          this.phaseStartTimestamp = timestamp
        }
        break
      }
      case 'wait': {
        drawPhotoCard(this.ctx, W, H)
        drawWatermark(this.ctx, W, H)
        if (timestamp - this.phaseStartTimestamp >= WAIT_MS)
          done = true
        break
      }
    }

    // MediaRecorder samples the canvas stream automatically each frame.
    // Stop the recorder after the final frame so that frame is included.
    if (done) {
      this.callbacks.onStopping()
      this.stopRecorder()
      return
    }

    this.rafId = requestAnimationFrame(this.drawFrame)
  }
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface PendingVideo {
  blob: Blob
  mimeType: string
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

type AnyRecordingSession = Mp4RecordingSession | WebmRecordingSession

export function useVideoRecorder() {
  const mapInstance = useMapStore(s => s.mapInstance)

  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null)

  const capabilityRef = useRef<RecordingCapability | null>(null)
  const sessionRef = useRef<AnyRecordingSession | null>(null)

  // Detect browser capability on mount
  useEffect(() => {
    detectCapability().then((cap) => {
      capabilityRef.current = cap
      if (cap.type === 'unsupported')
        setStatus('unsupported')
    })
  }, [])

  // Eagerly preload waypoint photos into cache
  useEffect(() => {
    return useReplayStore.subscribe((state) => {
      for (const wp of state.waypoints) {
        if (wp.marker.photo.thumbnailUrl)
          loadImage(wp.marker.photo.thumbnailUrl)
      }
    })
  }, [])

  /**
   * Starts recording immediately.
   * Uses MP4 (H.264 via WebCodecs) when available, falls back to WebM.
   * The logo intro is drawn on the composite canvas for INTRO_MS, in sync
   * with ReplayIntroOverlay which calls togglePlayPause on exit.
   * Sessions are self-terminating: they observe the replay store via
   * `shouldStop` and finalize themselves when the replay completes.
   */
  const startAutoRecord = useCallback(() => {
    if (!mapInstance || status !== 'idle')
      return
    const cap = capabilityRef.current
    if (!cap || cap.type === 'unsupported')
      return

    const mapCanvas = mapInstance.getCanvas()
    mapInstance.triggerRepaint()

    const shouldStop = () => useReplayStore.getState().status === 'completed'

    const callbacks: SessionCallbacks = {
      onStopping: () => setStatus('processing'),
      onComplete: (blob, mimeType) => {
        setPendingVideo({ blob, mimeType })
        setStatus('idle')
        sessionRef.current = null
      },
      onError: () => {
        setStatus('idle')
        sessionRef.current = null
      },
    }

    const session: AnyRecordingSession = cap.type === 'mp4'
      ? new Mp4RecordingSession(mapCanvas, shouldStop, callbacks)
      : new WebmRecordingSession(mapCanvas, cap.mimeType, shouldStop, callbacks)

    sessionRef.current = session
    session.start()
    setStatus('recording')
  }, [mapInstance, status])

  const saveVideo = useCallback(() => {
    if (!pendingVideo)
      return
    const { blob, mimeType } = pendingVideo
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `locusify-replay-${Date.now()}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    setPendingVideo(null)
  }, [pendingVideo])

  const discardVideo = useCallback(() => {
    sessionRef.current?.dispose()
    sessionRef.current = null
    setPendingVideo(null)
    setStatus(prev => (prev === 'recording' || prev === 'processing') ? 'idle' : prev)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.dispose()
    }
  }, [])

  return {
    status,
    pendingVideo,
    startAutoRecord,
    saveVideo,
    discardVideo,
    isSupported: status !== 'unsupported',
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
  }
}
