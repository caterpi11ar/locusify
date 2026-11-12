import type { SceneTypography } from './scene-typography'
import type { PhotoMarker } from '@/types/map'
import { Texture } from 'pixi.js'
import qrUrl from '@/assets/qrcode.jpeg'
import { getQuoteForPhoto } from '@/data/journalQuotes'
import { brandLoading } from '@/lib/brand-loading'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { getFilterStyle } from './filters'
import { applyCanvasTextStyle } from './scene-typography'

export async function loadSceneImage(url: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.referrerPolicy = 'no-referrer'
  await new Promise<void>((resolve, reject) => {
    let deadline: ReturnType<typeof setTimeout>
    const finish = (error?: unknown) => {
      clearTimeout(deadline)
      signal.removeEventListener('abort', aborted)
      if (error) {
        image.removeAttribute('src')
        reject(error)
      }
      else {
        resolve()
      }
    }
    function aborted() {
      finish(signal.reason)
    }
    // Failure deadline only: decoding, never a delay, determines readiness.
    deadline = setTimeout(() => finish(new Error('asset-unavailable')), 45000)
    signal.addEventListener('abort', aborted, { once: true })
    image.src = url
    void image.decode().then(() => finish(), () => finish(new Error('asset-unavailable')))
  })
  signal.throwIfAborted()
  return image
}

export async function loadSceneBrand(signal: AbortSignal) {
  const [logo, qr] = await Promise.all([loadSceneImage(brandLoading.logo, signal), loadSceneImage(qrUrl, signal)])
  return { logo, qr }
}

/** Show available photos independently; upgrade originals without hiding preview. */
export async function prepareScenePhotos(photos: Pick<PhotoMarker['photo'], 'thumbnailUrl' | 'originalUrl'>[], signal: AbortSignal, display: (index: number, image: HTMLImageElement) => void) {
  const images = new Map<string, Promise<HTMLImageElement>>()
  const originals = new Set<number>()
  const shown = new Map<number, HTMLImageElement>()
  const load = (url: string) => {
    if (!images.has(url))
      images.set(url, loadSceneImage(url, signal))
    return images.get(url)!
  }
  const show = (index: number, image: HTMLImageElement) => {
    signal.throwIfAborted()
    if (shown.get(index) !== image) {
      shown.set(index, image)
      display(index, image)
    }
  }
  const queue = (work: (photo: typeof photos[number], index: number) => Promise<void>) => {
    let next = 0
    return Promise.all(Array.from({ length: Math.min(3, photos.length) }, async () => {
      while (next < photos.length) {
        signal.throwIfAborted()
        const index = next++
        await work(photos[index], index)
      }
    }))
  }
  const previews = queue(async (photo, index) => {
    const image = await load(photo.thumbnailUrl || photo.originalUrl).catch(() => undefined)
    if (image && !originals.has(index))
      show(index, image)
  })
  void previews.catch(() => {})
  await queue(async (photo, index) => {
    let image: HTMLImageElement
    try {
      image = await load(photo.originalUrl || photo.thumbnailUrl)
    }
    catch {
      signal.throwIfAborted()
      image = await load(photo.thumbnailUrl)
    }
    originals.add(index)
    show(index, image)
  })
}

export function paintTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * 2)
  canvas.height = Math.ceil(height * 2)
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  draw(ctx)
  const texture = Texture.from(canvas)
  texture.source.resolution = 2
  return texture
}

export function drawFitted(ctx: CanvasRenderingContext2D, image: CanvasImageSource, width: number, height: number, sourceWidth: number, sourceHeight: number, contain: boolean) {
  const scale = (contain ? Math.min : Math.max)(width / sourceWidth, height / sourceHeight)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, height)
  ctx.clip()
  ctx.drawImage(image, (width - sourceWidth * scale) / 2, (height - sourceHeight * scale) / 2, sourceWidth * scale, sourceHeight * scale)
  ctx.restore()
}

export function photoTexture(image: HTMLImageElement, filter: { type: Parameters<typeof getFilterStyle>[0], intensity: number }) {
  return paintTexture(348, 261, (ctx) => {
    ctx.filter = getFilterStyle(filter.type, filter.intensity) || 'none'
    drawFitted(ctx, image, 348, 261, image.naturalWidth, image.naturalHeight, image.naturalHeight > image.naturalWidth)
  })
}

export function metadataTexture(marker: PhotoMarker, index: number, total: number, light: boolean, typography: SceneTypography) {
  return paintTexture(348, 36, (ctx) => {
    ctx.fillStyle = light ? '#404040' : '#cbd5e1'
    applyCanvasTextStyle(ctx, typography.date)
    ctx.fillText(marker.photo.dateTaken ? formatDate(new Date(marker.photo.dateTaken), { year: 'numeric', month: '2-digit', day: '2-digit' }) : `${index + 1} / ${total}`, 4, 16)
    applyCanvasTextStyle(ctx, typography.coordinates)
    ctx.textAlign = 'right'
    ctx.fillStyle = light ? '#737373' : '#94a3b8'
    ctx.fillText(formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef), 344, 16)
  })
}

export function captionTexture(marker: PhotoMarker, light: boolean, typography: SceneTypography) {
  return paintTexture(348, 160, (ctx) => {
    ctx.fillStyle = light ? '#171717' : '#fafafa'
    let y = 22
    if (marker.photo.title) {
      applyCanvasTextStyle(ctx, typography.captionTitle)
      // Match CSS truncate: preserve glyph proportions instead of squeezing text.
      let title = marker.photo.title
      if (ctx.measureText(title).width > 332) {
        const chars = Array.from(title)
        while (chars.length && ctx.measureText(`${chars.join('')}…`).width > 332) chars.pop()
        title = `${chars.join('')}…`
      }
      ctx.fillText(title, 8, y)
      y += 28
    }
    const lines = [marker.photo.description, getQuoteForPhoto(marker.id)].filter(Boolean)
    applyCanvasTextStyle(ctx, typography.captionBody)
    for (const line of lines) {
      let current = ''
      for (const char of line!) {
        if (ctx.measureText(current + char).width > 332) {
          ctx.fillText(current, 8, y)
          current = ''
          y += typography.captionBody.lineHeight
        }
        current += char
      }
      ctx.fillText(current, 8, y)
      y += 34
    }
  })
}

/** Reuse the app's existing icon asset, resolved once during preparation. */
export async function iconTexture(className: string, color: string, signal: AbortSignal) {
  const element = document.createElement('i')
  element.className = className
  element.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  document.body.append(element)
  const url = getComputedStyle(element).maskImage
  element.remove()
  if (!url.startsWith('url('))
    return Texture.EMPTY
  const image = await loadSceneImage(url.slice(4, -1).replace(/^"|"$/g, ''), signal)
  return paintTexture(32, 32, (ctx) => {
    ctx.drawImage(image, 0, 0, 32, 32)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 32, 32)
  })
}
