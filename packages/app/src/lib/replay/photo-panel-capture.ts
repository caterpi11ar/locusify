import type { ReplayTemplateConfig } from '@/types/template'
import { easePhoto, easeScroll } from './scene-motion'

interface Motion {
  hang: number
  angle: number
  brightness: number
  x: number
  y: number
  scale: number
  opacity: number
  blur: number
}

function position(element: HTMLElement, ancestor: HTMLElement) {
  let x = 0
  let y = 0
  for (let node: HTMLElement | null = element; node && node !== ancestor; node = node.offsetParent as HTMLElement | null) {
    x += node.offsetLeft
    y += node.offsetTop
  }
  return { x, y }
}

/** Rasterize static CSS once; the offscreen clone cannot disturb React or playback. */
async function raster(element: HTMLElement | SVGSVGElement, width: number, scale: number, signal: AbortSignal, decoration = false) {
  const { snapdom } = await import('@zumer/snapdom')
  const host = document.createElement('div')
  const clone = element.cloneNode(true) as HTMLElement
  const style = getComputedStyle(element)
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;padding:32px;box-sizing:content-box;pointer-events:none`
  host.style.font = style.font
  host.style.color = style.color
  clone.removeAttribute('hidden')
  Object.assign(clone.style, { position: 'relative', inset: 'auto', margin: '0', width: `${width}px`, maxWidth: 'none', transform: 'none', opacity: '1', filter: 'none', visibility: 'visible' })
  if (decoration) {
    clone.querySelector<HTMLElement>('[data-replay-media]')!.style.visibility = 'hidden'
    clone.querySelector('[data-replay-media]')!.replaceChildren()
  }
  host.append(clone)
  document.body.append(host)
  try {
    signal.throwIfAborted()
    const result = await snapdom(host, { dpr: 1, scale, embedFonts: true })
    const canvas = await result.toCanvas()
    signal.throwIfAborted()
    return { canvas, width: host.offsetWidth, height: host.offsetHeight }
  }
  finally { host.remove() }
}

type Raster = Awaited<ReturnType<typeof raster>>
interface Layers {
  key: string
  width: number
  height: number
  rope: Raster
  ropeY: number
  railTop: number
  railHeight: number
  caption: { x: number, y: number }
  cards: { x: number, y: number, width: number, mediaHeight: number, origin: number[], decoration: Raster, caption: Raster, photo: HTMLCanvasElement, filter: string }[]
}

/** One DOM layout, driven by video time rather than wall-clock CSS animations. */
export class PhotoPanelCapture {
  private index = -1
  private previous = 0
  private changedAt = -10
  private scrollFrom = 0
  private lastTime = 0
  private animateMedia = false
  private assetVersion = 0
  private rail: HTMLElement
  private cards: { root: HTMLElement, body: HTMLElement, media: HTMLElement, image: HTMLImageElement, video: HTMLCanvasElement, caption: HTMLElement }[]
  private motion: Motion[] = []
  private captionProgress = 1
  private scroll = 0
  private map?: HTMLCanvasElement
  private layers?: Layers
  private preparing?: Promise<void>
  private canvas = document.createElement('canvas')

  constructor(readonly element: HTMLElement) {
    this.rail = element.querySelector('[data-replay-rail]')!
    this.cards = Array.from(element.querySelectorAll<HTMLElement>('[data-replay-card]')).map((root, index) => ({
      root,
      body: root.querySelector('[data-replay-body]')!,
      media: root.querySelector('[data-replay-media]')!,
      image: root.querySelector('[data-replay-image]')!,
      video: root.querySelector('[data-replay-video]')!,
      caption: element.querySelector(`[data-replay-caption="${index}"]`)!,
    }))
  }

  setPhoto(index: number, image: HTMLImageElement) {
    const target = this.element.querySelector<HTMLImageElement>(`[data-replay-image="${index}"]`)!
    // Keep the existing element (and React's DOM ownership) when upgrading thumbnails.
    if (target.src !== image.src) {
      target.src = image.src
      this.assetVersion++
    }
  }

  videoCanvas(index: number) {
    return this.cards[index].video
  }

  update(map: HTMLCanvasElement, index: number, time: number, config: ReplayTemplateConfig, videos: boolean[]) {
    this.map = map
    if (index !== this.index || time < this.lastTime) {
      const target = this.cards[index].root
      // A neighbouring photo is already visible on the rail. Restarting its
      // opacity/scale animation would make it disappear at the selection boundary.
      this.animateMedia = this.index >= 0 && (target.offsetLeft >= this.rail.scrollLeft + this.rail.clientWidth || target.offsetLeft + target.offsetWidth <= this.rail.scrollLeft)
      this.previous = this.index < 0 ? index : this.index
      this.changedAt = this.index < 0 || time < this.lastTime ? time - 10 : time
      this.scrollFrom = this.rail.scrollLeft
      this.index = index
    }
    this.lastTime = time
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const elapsed = time - this.changedAt
    // Read layout before changing transforms/filters to avoid per-card reflows.
    const width = this.rail.clientWidth
    const geometry = this.cards.map(card => ({ left: card.root.offsetLeft, width: card.root.offsetWidth }))
    const target = geometry[index]
    const offset = Math.max(0, target.left + target.width / 2 - width / 2)
    this.rail.scrollLeft = this.scrollFrom + (offset - this.scrollFrom) * (reduced ? 1 : easeScroll(elapsed / 0.5))
    const scroll = this.rail.scrollLeft
    this.scroll = scroll
    const transition = config.transitions
    const progress = reduced || !this.animateMedia ? 1 : easePhoto(elapsed / (transition.type === 'cut' ? 0.05 : transition.duration / 1000))
    for (const [i, card] of this.cards.entries()) {
      const position = Math.max(0, Math.min(1, (geometry[i].left + geometry[i].width / 2 - scroll) / width))
      const hang = 96 * position * (1 - position)
      const tilt = reduced ? 0 : [-2, 1.6, -1, 2][i % 4]
      card.root.style.transform = `translateY(${hang}px) rotate(${tilt}deg)`
      card.body.style.transform = 'none'
      const brightnessProgress = reduced ? 1 : Math.min(1, elapsed / 0.3)
      const brightness = i === index ? (i === this.previous ? 1 : 0.5 + brightnessProgress * 0.5) : i === this.previous ? 1 - brightnessProgress * 0.5 : 0.5
      card.body.style.filter = `brightness(${brightness})`
      const p = i === index ? progress : 1
      const x = transition.type === 'slide-left' ? 60 * (1 - p) : 0
      const y = transition.type === 'slide-up' ? 60 * (1 - p) : 0
      const scale = transition.type === 'zoom-in' ? 0.7 + 0.3 * p : transition.type === 'crossfade' ? 0.96 + 0.04 * p : 1
      card.media.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      card.media.style.opacity = String(p)
      card.media.style.filter = transition.type === 'blur' ? `blur(${12 * (1 - p)}px)` : ''
      card.video.hidden = !(i === index && videos[i])
      card.image.style.visibility = card.video.hidden ? 'visible' : 'hidden'
      card.caption.hidden = i !== index
      const captionProgress = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - 0.3) / 0.3))
      card.caption.style.opacity = String(captionProgress)
      card.caption.style.transform = `translateY(${8 * (1 - captionProgress)}px)`
      this.captionProgress = captionProgress
      this.motion[i] = {
        hang,
        angle: tilt,
        brightness,
        x,
        y,
        scale,
        opacity: p,
        blur: transition.type === 'blur' ? 12 * (1 - p) : 0,
      }
    }
  }

  private cacheKey() {
    return `${this.element.clientWidth}:${this.element.clientHeight}:${window.innerHeight}:${this.assetVersion}`
  }

  async prepare(signal: AbortSignal) {
    while (this.layers?.key !== this.cacheKey()) {
      signal.throwIfAborted()
      if (!this.preparing) {
        this.preparing = this.prepareLayers(signal).finally(() => {
          this.preparing = undefined
        })
      }
      await this.preparing
    }
  }

  private async prepareLayers(signal: AbortSignal) {
    await Promise.all(this.cards.map(card => card.image.decode()))
    await document.fonts.ready
    signal.throwIfAborted()
    const width = this.element.clientWidth
    const height = this.element.clientHeight
    const key = this.cacheKey()
    // Keep detail through rotation and the final compositor resampling.
    const scale = 1536 / width
    const svg = this.element.querySelector('svg')!
    const section = position(this.rail, this.element)
    const caption = position(this.cards[this.index < 0 ? 0 : this.index].caption, this.element)
    const cards: Layers['cards'] = []
    for (const card of this.cards) {
      const point = position(card.root, this.element)
      const mediaWidth = card.media.clientWidth
      const mediaHeight = card.media.clientHeight
      const origin = getComputedStyle(card.root).transformOrigin.split(' ').map(Number.parseFloat)
      const photo = document.createElement('canvas')
      photo.width = Math.ceil(mediaWidth * scale)
      photo.height = Math.ceil(mediaHeight * scale)
      const ctx = photo.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      const filter = getComputedStyle(card.media.parentElement!).filter
      ctx.filter = filter
      const fit = getComputedStyle(card.image).objectFit
      const factor = (fit === 'contain' ? Math.min : Math.max)(photo.width / card.image.naturalWidth, photo.height / card.image.naturalHeight)
      const w = card.image.naturalWidth * factor
      const h = card.image.naturalHeight * factor
      ctx.drawImage(card.image, (photo.width - w) / 2, (photo.height - h) / 2, w, h)
      cards.push({ ...point, width: mediaWidth, mediaHeight, origin, photo, filter, decoration: await raster(card.body, mediaWidth, scale, signal, true), caption: await raster(card.caption, card.caption.parentElement!.clientWidth, scale, signal) })
    }
    this.layers = { key, width, height, cards, caption, rope: await raster(svg, width, scale, signal), ropeY: section.y + Number.parseFloat(getComputedStyle(svg).top), railTop: section.y, railHeight: this.rail.clientHeight }
  }

  /** No DOM serialization, image decoding or texture allocation in the frame loop. */
  async capture(signal: AbortSignal) {
    await this.prepare(signal)
    const layers = this.layers!
    const scale = 768 / layers.width
    const height = Math.round(layers.height * scale)
    if (this.canvas.width !== 768 || this.canvas.height !== height) {
      this.canvas.width = 768
      this.canvas.height = height
    }
    const ctx = this.canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.resetTransform()
    ctx.clearRect(0, 0, 768, height)
    ctx.scale(scale, scale)
    // Blur the live map directly; no data URLs or map-to-DOM round trip.
    ctx.filter = `blur(${8 * scale}px)`
    ctx.drawImage(this.map!, 0, 0, layers.width * 2.5, layers.height)
    ctx.filter = 'none'
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.fillRect(0, 0, layers.width, layers.height)
    const draw = (layer: Raster, x: number, y: number) => ctx.drawImage(layer.canvas, x - 32, y - 32, layer.width, layer.height)
    draw(layers.rope, 0, layers.ropeY)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, layers.railTop, layers.width, layers.railHeight)
    ctx.clip()
    for (const [i, card] of layers.cards.entries()) {
      const motion = this.motion[i]
      const x = card.x - this.scroll
      if (x + card.width < -100 || x > layers.width + 100)
        continue
      ctx.save()
      ctx.translate(x + card.origin[0], card.y + card.origin[1] + motion.hang)
      ctx.rotate(motion.angle * Math.PI / 180)
      ctx.translate(-card.origin[0], -card.origin[1])
      ctx.save()
      ctx.translate(card.width / 2 + motion.x, card.mediaHeight / 2 + motion.y)
      ctx.scale(motion.scale, motion.scale)
      ctx.translate(-card.width / 2, -card.mediaHeight / 2)
      ctx.globalAlpha = motion.opacity
      const video = !this.cards[i].video.hidden
      ctx.filter = `${video && card.filter !== 'none' ? card.filter : ''} brightness(${motion.brightness}) blur(${motion.blur * scale * motion.scale}px)`
      ctx.drawImage(video ? this.cards[i].video : card.photo, 0, 0, card.width, card.mediaHeight)
      ctx.restore()
      ctx.filter = `brightness(${motion.brightness})`
      draw(card.decoration, 0, 0)
      ctx.restore()
    }
    ctx.restore()
    ctx.globalAlpha = this.captionProgress
    draw(layers.cards[this.index].caption, layers.caption.x, layers.caption.y + 8 * (1 - this.captionProgress))
    ctx.globalAlpha = 1
    return this.canvas
  }
}
