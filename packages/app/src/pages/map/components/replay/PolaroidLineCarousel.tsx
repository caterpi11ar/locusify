import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type { ReplayWaypoint } from '@/stores/replay/types'
import type { ReplayTemplateConfig } from '@/types/template'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LazyMedia } from '@/components/ui/lazy-media'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { getFilterStyle } from '@/lib/replay/filters'

interface Props {
  waypoints: ReplayWaypoint[]
  activeIndex: number
  onSelect: (index: number) => void
  templateConfig: ReplayTemplateConfig
}

/** Replay owns selection. Scroll events only update geometry, never seek playback. */
export function PolaroidLineCarousel({ waypoints, activeIndex, onSelect, templateConfig }: Props) {
  const { t } = useTranslation()
  const rail = useRef<HTMLUListElement>(null)
  const drag = useRef<{ id: number, x: number, y: number, scroll: number, moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const frame = useRef(0)
  const active = Math.max(0, Math.min(activeIndex, waypoints.length - 1))
  const activeRef = useRef(active)

  const offsets = () => {
    const cards = Array.from(rail.current?.children ?? []) as HTMLElement[]
    return cards.map(card => card.offsetLeft - (cards[0]?.offsetLeft ?? 0))
  }

  const position = useCallback(() => {
    const node = rail.current
    if (!node)
      return
    for (const card of Array.from(node.children) as HTMLElement[]) {
      const x = Math.max(0, Math.min(1, (card.offsetLeft + card.offsetWidth / 2 - node.scrollLeft) / node.clientWidth))
      card.style.setProperty('--hang-y', `${4 * 24 * x * (1 - x)}px`)
    }
  }, [])

  const scrollTo = useCallback((index: number, smooth = true) => {
    rail.current?.scrollTo({
      left: offsets()[index] ?? 0,
      behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant',
    })
  }, [])

  useEffect(() => {
    activeRef.current = active
    // A replay update wins over an unfinished gesture.
    drag.current = null
    if (rail.current)
      rail.current.dataset.dragging = 'false'
    scrollTo(active)
  }, [active, waypoints, scrollTo])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      scrollTo(activeRef.current, false)
      position()
    })
    if (rail.current)
      observer.observe(rail.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [waypoints, position, scrollTo])

  const select = (index: number) => {
    const next = Math.max(0, Math.min(index, waypoints.length - 1))
    scrollTo(next)
    if (next !== active)
      onSelect(next)
  }

  const onKey = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return
    const next = event.key === 'ArrowRight' ? active + 1 : event.key === 'ArrowLeft' ? active - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? waypoints.length - 1 : undefined
    if (next === undefined)
      return
    event.preventDefault()
    const destination = Math.max(0, Math.min(next, waypoints.length - 1))
    rail.current?.children[destination]?.querySelector('button')?.focus({ preventScroll: true })
    select(destination)
  }

  const endDrag = (event: PointerEvent<HTMLUListElement>, cancelled = false) => {
    const start = drag.current
    if (!start || start.id !== event.pointerId)
      return
    drag.current = null
    event.currentTarget.dataset.dragging = 'false'
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (!start.moved)
      return
    suppressClick.current = true
    if (cancelled) {
      scrollTo(active)
      return
    }
    const left = event.currentTarget.scrollLeft
    const positions = offsets()
    const nearest = positions.reduce((best, offset, index) => Math.abs(offset - left) < Math.abs(positions[best] - left) ? index : best, 0)
    select(nearest)
  }

  if (!waypoints.length)
    return null

  return (
    <section aria-label={t('replay.photos.label')} aria-roledescription="carousel" className="min-w-0 overflow-hidden rounded-2xl bg-linear-[160deg,#eaf3fd,#f5f8fc] py-4 dark:bg-linear-[160deg,#102235,#0c151f]">
      <div className="relative">
        <svg className="pointer-events-none absolute left-0 top-3.5 h-12 w-full text-[#8fa8be] dark:text-[#65809a]" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 Q600 48 1200 0" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul
          ref={rail}
          aria-label={t('replay.photos.navigation')}
          tabIndex={0}
          className="relative m-0 flex list-none items-start gap-7 overflow-x-auto overscroll-x-contain px-6 pb-12 pt-8 [scrollbar-width:none] touch-pan-y cursor-grab select-none focus-visible:outline-2 focus-visible:outline-accent data-[dragging=true]:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          onKeyDown={onKey}
          onScroll={() => {
            if (!frame.current) {
              frame.current = requestAnimationFrame(() => {
                frame.current = 0
                position()
              })
            }
          }}
          onPointerDown={(event) => {
            suppressClick.current = false
            if (!event.isPrimary || event.button !== 0)
              return
            // Stop any in-flight smooth scroll before measuring a new gesture.
            event.currentTarget.scrollTo({ left: event.currentTarget.scrollLeft, behavior: 'instant' })
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: event.currentTarget.scrollLeft, moved: false }
          }}
          onPointerMove={(event) => {
            const start = drag.current
            if (!start || start.id !== event.pointerId)
              return
            const dx = event.clientX - start.x
            if (!start.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
              start.moved = true
              event.currentTarget.setPointerCapture(event.pointerId)
              event.currentTarget.dataset.dragging = 'true'
            }
            if (start.moved) {
              event.preventDefault()
              event.currentTarget.scrollLeft = start.scroll - dx
            }
          }}
          onPointerUp={event => endDrag(event)}
          onPointerCancel={event => endDrag(event, true)}
          onPointerLeave={() => {
            if (!drag.current?.moved)
              drag.current = null
          }}
          onLostPointerCapture={(event) => {
            // Touch starts with implicit capture on the image. Its bubbled loss
            // when capture moves to the rail must not cancel the new drag.
            if (event.target === event.currentTarget && drag.current)
              endDrag(event, true)
          }}
          onDragStart={event => event.preventDefault()}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              event.preventDefault()
              event.stopPropagation()
              suppressClick.current = false
            }
          }}
        >
          {waypoints.map(({ id, marker }, index) => (
            <li
              key={id}
              data-selected={active === index}
              className="relative w-full shrink-0 origin-[50%_-18px] [transform:translateY(var(--hang-y,12px))_rotate(var(--tilt))] motion-reduce:[transform:translateY(var(--hang-y,12px))]"
              style={{ '--tilt': `${[-2, 1.6, -1, 2][index % 4]}deg` } as CSSProperties}
            >
              <div className={`relative rounded-[3px] bg-white p-2 pb-4 text-neutral-900 shadow-[0_12px_25px_-12px_rgb(23_53_83/0.3)] transition-[scale,box-shadow] duration-300 motion-reduce:transition-none dark:bg-[#19232f] dark:text-[#f5f7fa] ${active === index ? 'ring-2 ring-accent/60' : 'scale-95'}`}>
                <span aria-hidden="true" className="pointer-events-none absolute -top-[18px] left-[calc(50%-6px)] z-10 h-[29px] w-3 rounded-[3px] bg-linear-[90deg,#6d8ca7,#b7cce0_48%,#6d8ca7] shadow-sm after:absolute after:left-[5px] after:top-[9px] after:h-[9px] after:w-0.5 after:rounded-[1px] after:bg-[#6d8ca7] dark:bg-linear-[90deg,#3d617e,#799cbb_48%,#3d617e]" />
                <div style={{ filter: getFilterStyle(templateConfig.filter.type, templateConfig.filter.intensity) }}>
                  <LazyMedia
                    src={marker.photo.thumbnailUrl}
                    alt={marker.photo.title || id}
                    className="aspect-[4/3] max-h-[33dvh] w-full bg-black/5"
                    objectFit={marker.photo.height > marker.photo.width ? 'contain' : 'cover'}
                    thumbHash={marker.photo.thumbHash}
                    videoSource={marker.photo.video}
                  />
                </div>
                <button
                  type="button"
                  aria-label={t('replay.photos.select', { index: index + 1, title: marker.photo.title })}
                  aria-pressed={active === index}
                  tabIndex={active === index ? 0 : -1}
                  onClick={() => select(index)}
                  className="mt-2 flex w-full cursor-pointer flex-wrap items-baseline justify-between gap-1 rounded px-1 text-left focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="font-handwriting text-[0.65rem] text-neutral-700 dark:text-slate-300">
                    {marker.photo.dateTaken ? formatDate(new Date(marker.photo.dateTaken), { year: 'numeric', month: '2-digit', day: '2-digit' }) : `${index + 1} / ${waypoints.length}`}
                  </span>
                  <span className="font-mono text-[0.5rem] text-neutral-500 dark:text-slate-400">
                    {formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef)}
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 text-xs text-neutral-700 dark:text-slate-300">
        <span role="status" aria-live="polite" aria-atomic="true" className="tabular-nums">
          {active + 1}
          {' / '}
          {waypoints.length}
        </span>
        <div className="flex gap-2">
          <button type="button" disabled={active === 0} onClick={() => select(active - 1)} aria-label={t('replay.photos.previous')} className="grid size-9 cursor-pointer place-items-center rounded-full border border-current/20 bg-white transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-35 dark:bg-slate-800">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={active === waypoints.length - 1} onClick={() => select(active + 1)} aria-label={t('replay.photos.next')} className="grid size-9 cursor-pointer place-items-center rounded-full border border-current/20 bg-white transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-35 dark:bg-slate-800">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
