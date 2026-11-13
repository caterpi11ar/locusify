import { useTranslation } from 'react-i18next'
import { getQuoteForPhoto } from '@/data/journalQuotes'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { getFilterStyle } from '@/lib/replay/filters'
import { useReplayStore } from '@/stores/replayStore'
import { MetadataEditor } from './MetadataEditor'

/** HTML is the photo layout for both the visible replay and captured video frames. */
export function PhotoPanel() {
  const { t } = useTranslation()
  const waypoints = useReplayStore(s => s.waypoints)
  const active = useReplayStore(s => Math.min(s.currentWaypointIndex, s.waypoints.length - 1))
  const configuring = useReplayStore(s => s.status === 'configuring')
  const config = useReplayStore(s => s.templateConfig)
  const waypoint = waypoints[active]

  return (
    <div data-testid="replay-photo-panel" className="pointer-events-auto absolute inset-y-0 left-0 isolate flex w-[40%] flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-sm" />
      <div className="relative flex flex-1 items-start overflow-y-auto pt-16 lg:pt-24">
        <div className="w-full min-w-0">
          <section aria-label={t('replay.photos.label')} className="relative w-full min-w-0 overflow-hidden">
            <svg className="pointer-events-none absolute left-0 top-3.5 h-12 w-full text-[#8fa8be] dark:text-[#65809a]" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 0 Q600 48 1200 0" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <ul data-replay-rail className="pointer-events-none relative m-0 flex list-none items-start gap-3 overflow-hidden px-[16%] pb-10 pt-8 select-none sm:gap-5">
              {waypoints.map(({ id, marker }, index) => (
                <li key={id} data-replay-card={index} aria-current={active === index ? 'true' : undefined} className="relative w-full shrink-0 origin-[50%_-18px]">
                  <div data-replay-body className="relative origin-[50%_-18px] text-neutral-900 dark:text-[#f5f7fa]">
                    <span data-replay-clip aria-hidden="true" className="pointer-events-none absolute -top-[18px] left-[calc(50%-6px)] z-10 h-[29px] w-3 rounded-[3px] bg-linear-[90deg,#6d8ca7,#b7cce0_48%,#6d8ca7] shadow-sm after:absolute after:left-[5px] after:top-[9px] after:h-[9px] after:w-0.5 after:rounded-[1px] after:bg-[#6d8ca7] dark:bg-linear-[90deg,#3d617e,#799cbb_48%,#3d617e]" />
                    <div style={{ filter: getFilterStyle(config.filter.type, config.filter.intensity) }}>
                      <div data-replay-media className="relative aspect-[4/3] max-h-[45dvh] w-full overflow-hidden">
                        <img data-replay-image={index} src={marker.photo.thumbnailUrl} crossOrigin="anonymous" alt={marker.photo.title || id} className="size-full" style={{ objectFit: marker.photo.height > marker.photo.width ? 'contain' : 'cover' }} />
                        <canvas data-replay-video={index} hidden className="absolute inset-0 size-full" />
                      </div>
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
            <span role="status" aria-live="polite" className="sr-only">
              {active + 1}
              {' '}
              /
              {' '}
              {waypoints.length}
            </span>
          </section>
          <div className="mx-auto w-[68%]">
            {configuring && waypoint && (
              <div data-replay-editor>
                <MetadataEditor key={waypoint.id} photoId={waypoint.id} currentTitle={waypoint.marker.photo.title} currentDateTaken={waypoint.marker.photo.dateTaken} />
              </div>
            )}
            {waypoints.map(({ id, marker }, index) => (
              <div key={id} data-replay-caption={index} hidden={active !== index} className="mt-8 px-2">
                {marker.photo.title && <h3 className="truncate font-serif text-[1.05rem] font-semibold tracking-[0.02em] text-black/90 dark:text-white/90">{marker.photo.title}</h3>}
                {marker.photo.description && <p className="mt-1.5 font-serif text-[0.85rem] italic leading-[1.7] text-black/70 dark:text-white/70">{marker.photo.description}</p>}
                <p className="mt-3 font-serif text-[0.85rem] italic leading-[1.7] text-black/90 dark:text-white/90">{getQuoteForPhoto(id)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
