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

function createStars(): Star[] {
  const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.2
  return Array.from({ length: STAR_COUNT }, () => ({
    orbitRadius: Math.random() * maxRadius,
    angle: Math.random() * Math.PI * 2,
    speed: (0.0001 + Math.random() * 0.0003) * (Math.random() < 0.5 ? 1 : -1),
    alpha: 0.2 + Math.random() * 0.8,
  }))
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

    function frame() {
      // Opaque space background
      ctx.globalAlpha = 1
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, width, height)

      // 1px star dots
      ctx.fillStyle = DOT_COLOR
      for (const star of stars) {
        star.angle += star.speed
        const x = Math.sin(star.angle) * star.orbitRadius + cx
        const y = Math.cos(star.angle) * star.orbitRadius + cy
        ctx.globalAlpha = star.alpha
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
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
