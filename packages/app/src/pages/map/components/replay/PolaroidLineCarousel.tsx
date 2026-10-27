import type { CSSProperties } from 'react'
import type { ReplayWaypoint } from '@/stores/replay/types'
import type { ReplayTemplateConfig } from '@/types/template'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LazyMedia } from '@/components/ui/lazy-media'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { getFilterStyle } from '@/lib/replay/filters'
import { getTransitionVariants } from '@/lib/replay/transitions'

interface Props {
  waypoints: ReplayWaypoint[]
  activeIndex: number
  templateConfig: ReplayTemplateConfig
}

/** Display only: replay owns selection and scrolling; the rail never seeks. */
export function PolaroidLineCarousel({ waypoints, activeIndex, templateConfig }: Props) {
  const { t } = useTranslation()
  const rail = useRef<HTMLUListElement>(null)
  const frame = useRef(0)
  const active = Math.max(0, Math.min(activeIndex, waypoints.length - 1))
  const activeRef = useRef(active)

  const offsets = () => {
    const node = rail.current
    if (!node)
      return []
    const cards = Array.from(node.children) as HTMLElement[]
    return cards.map(card => Math.max(0, card.offsetLeft + card.offsetWidth / 2 - node.clientWidth / 2))
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
    const previous = activeRef.current
    activeRef.current = active
    scrollTo(active)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations: Animation[] = []
    if (previous !== active && !reducedMotion.matches) {
      const transition = getTransitionVariants(templateConfig.transitions.type, templateConfig.transitions.duration)
      const media = rail.current?.children[active]?.firstElementChild?.children[1]?.firstElementChild
      if (media) {
        const keyframes = [transition.initial, transition.animate].map(state => ({
          opacity: state.opacity ?? 1,
          filter: state.filter ?? 'none',
          transform: `translate(${state.x ?? 0}px, ${state.y ?? 0}px) scale(${state.scale ?? 1})`,
        } as Keyframe))
        animations.push(media.animate(keyframes, {
          duration: transition.transition.duration * 1000,
          easing: transition.transition.ease ? `cubic-bezier(${transition.transition.ease.join(',')})` : 'linear',
        }))
      }
      const direction = active > previous ? 1 : -1
      // Keep string height and resting tilt separate from the damped swing.
      for (const [index, card] of Array.from(rail.current?.children ?? []).entries()) {
        if (Math.abs(index - active) > 1 && index !== previous)
          continue
        const photo = card.firstElementChild
        if (photo) {
          animations.push(photo.animate(
            [0, -7, 4, -2, 0.8, 0].map(angle => ({ transform: `rotate(${angle * direction}deg)` })),
            { duration: 850, easing: 'ease-out' },
          ))
        }
      }
    }
    const stopMotion = () => {
      if (reducedMotion.matches) {
        animations.forEach(animation => animation.cancel())
        scrollTo(active, false)
      }
    }
    reducedMotion.addEventListener('change', stopMotion)
    return () => {
      reducedMotion.removeEventListener('change', stopMotion)
      animations.forEach(animation => animation.cancel())
    }
  }, [active, waypoints, scrollTo, templateConfig.transitions.type, templateConfig.transitions.duration])

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

  if (!waypoints.length)
    return null

  return (
    <section aria-label={t('replay.photos.label')} className="relative w-full min-w-0 overflow-hidden">
      <div className="relative">
        <svg className="pointer-events-none absolute left-0 top-3.5 h-12 w-full text-[#8fa8be] dark:text-[#65809a]" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 Q600 48 1200 0" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul
          ref={rail}
          className="pointer-events-none relative m-0 flex list-none items-start gap-3 overflow-hidden px-[16%] pb-10 pt-8 select-none sm:gap-5"
          onScroll={() => {
            if (!frame.current) {
              frame.current = requestAnimationFrame(() => {
                frame.current = 0
                position()
              })
            }
          }}

        >
          {waypoints.map(({ id, marker }, index) => (
            <li
              key={id}
              data-selected={active === index}
              aria-current={active === index ? 'true' : undefined}
              className="relative w-full shrink-0 origin-[50%_-18px] [transform:translateY(var(--hang-y,12px))_rotate(var(--tilt))] motion-reduce:[transform:translateY(var(--hang-y,12px))]"
              style={{ '--tilt': `${[-2, 1.6, -1, 2][index % 4]}deg` } as CSSProperties}
            >
              <div className={`relative origin-[50%_-18px] text-neutral-900 transition-opacity duration-300 motion-reduce:transition-none dark:text-[#f5f7fa] ${active === index ? 'opacity-100' : 'opacity-50'}`}>
                <span aria-hidden="true" className="pointer-events-none absolute -top-[18px] left-[calc(50%-6px)] z-10 h-[29px] w-3 rounded-[3px] bg-linear-[90deg,#6d8ca7,#b7cce0_48%,#6d8ca7] shadow-sm after:absolute after:left-[5px] after:top-[9px] after:h-[9px] after:w-0.5 after:rounded-[1px] after:bg-[#6d8ca7] dark:bg-linear-[90deg,#3d617e,#799cbb_48%,#3d617e]" />
                <div style={{ filter: getFilterStyle(templateConfig.filter.type, templateConfig.filter.intensity) }}>
                  <LazyMedia
                    key={`${id}-${active === index}`}
                    src={marker.photo.thumbnailUrl}
                    alt={marker.photo.title || id}
                    className="aspect-[4/3] max-h-[45dvh] w-full"
                    objectFit={marker.photo.height > marker.photo.width ? 'contain' : 'cover'}
                    thumbHash={marker.photo.thumbHash}
                    videoSource={active === index ? marker.photo.video : undefined}
                    showBadge={false}
                  />
                </div>
                <div className="mt-2 flex w-full flex-wrap items-baseline justify-between gap-1 px-1 text-left">
                  <span className="font-handwriting text-[0.65rem] text-neutral-700 dark:text-slate-300">
                    {marker.photo.dateTaken ? formatDate(new Date(marker.photo.dateTaken), { year: 'numeric', month: '2-digit', day: '2-digit' }) : `${index + 1} / ${waypoints.length}`}
                  </span>
                  <span className="font-mono text-[0.5rem] text-neutral-500 dark:text-slate-400">
                    {formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {active + 1}
        {' / '}
        {waypoints.length}
      </span>
    </section>
  )
}
