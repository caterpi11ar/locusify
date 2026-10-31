import { useEffect, useRef } from 'react'
import { useRegionStore } from '@/stores/regionStore'
import { useReplayStore } from '@/stores/replayStore'

interface Star {
  orbitRadius: number
  angle: number
  speed: number
  alpha: number
}

const STAR_COUNT = 1500
const BG_COLOR = '#0e0e0e'
const DOT_COLOR = 'rgb(255,255,255)'

export function createStars(maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.2): Star[] {
  return Array.from({ length: STAR_COUNT }, (): Star => ({
    orbitRadius: Math.random() * maxRadius,
    angle: Math.random() * Math.PI * 2,
    // Tangential speed in CSS pixels per second, independent of orbit size/FPS.
    speed: (0.1 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1),
    alpha: 0.2 + Math.random() * 0.8,
  }))
}

export function advanceStar(star: Star, elapsedMs: number) {
  const seconds = Math.min(Math.max(elapsedMs, 0), 100) / 1000
  star.angle += star.speed * seconds / Math.max(star.orbitRadius, 1)
}

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isFragmentMode = useRegionStore(s => s.isFragmentMode)
  const earthZoomPhase = useReplayStore(s => s.earthZoomPhase)
  const showStarfield = isFragmentMode
    || (earthZoomPhase !== 'idle' && earthZoomPhase !== 'done')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!showStarfield || !canvas)
      return

    const parent = canvas.parentElement
    if (!parent)
      return

    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    let width = parent.clientWidth
    let height = parent.clientHeight
    let cx = width / 2
    let cy = height / 2
    const stars = createStars()

    function resize() {
      width = parent!.clientWidth
      height = parent!.clientHeight
      cx = width / 2
      cy = height / 2
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    let raf = 0
    let previousTime: number | null = null

    function frame(time: number) {
      raf = 0
      if (document.hidden)
        return
      const elapsedMs = previousTime === null ? 0 : time - previousTime
      previousTime = time

      // Opaque space background
      ctx.globalAlpha = 1
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, width, height)

      // 1px star dots
      ctx.fillStyle = DOT_COLOR
      for (const star of stars) {
        advanceStar(star, elapsedMs)
        const x = Math.sin(star.angle) * star.orbitRadius + cx
        const y = Math.cos(star.angle) * star.orbitRadius + cy
        ctx.globalAlpha = star.alpha
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
      }
      ctx.globalAlpha = 1
      start()
    }

    function start() {
      if (!raf && !document.hidden)
        raf = requestAnimationFrame(frame)
    }

    function stop() {
      previousTime = null
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    start()
    const handleVisibility = () => {
      if (document.hidden)
        stop()
      else
        start()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [showStarfield])

  if (!showStarfield)
    return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 size-full"
    />
  )
}
