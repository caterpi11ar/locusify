import { AnimatePresence, m } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { getRandomQuote } from '@/data/journalQuotes'
import { useReplayStore } from '@/stores/replayStore'
import { MetadataEditor } from './MetadataEditor'
import { PhotoPanelBackground } from './PhotoPanelBackground'
import { PhotoTicket } from './PhotoTicket'

export function PhotoPanel() {
  const waypoints = useReplayStore(s => s.waypoints)
  const currentWaypointIndex = useReplayStore(s => s.currentWaypointIndex)
  const status = useReplayStore(s => s.status)
  const templateConfig = useReplayStore(s => s.templateConfig)

  // Determine which waypoint to show
  const displayIndex = status === 'completed'
    ? waypoints.length - 1
    : Math.min(currentWaypointIndex, waypoints.length - 1)
  const waypoint = waypoints[displayIndex] ?? null

  // Pick a stable random quote per displayIndex
  const quoteRef = useRef<string | undefined>(undefined)
  const quote = useMemo(() => {
    const q = getRandomQuote(quoteRef.current)
    quoteRef.current = q
    return q
  }, [displayIndex])

  // Preload next photo
  const preloadRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const nextWp = waypoints[displayIndex + 1]
    const nextUrl = nextWp?.marker.photo.thumbnailUrl
    if (nextUrl) {
      const img = new Image()
      img.src = nextUrl
      preloadRef.current = img
    }
  }, [displayIndex, waypoints])

  return (
    <div className="pointer-events-auto absolute inset-y-0 left-0 z-20 flex w-[40%] flex-col">
      {/* Paper texture background */}
      <PhotoPanelBackground />

      {/* Ticket area — vertically centered */}
      <div className="relative flex flex-1 items-start justify-center overflow-hidden px-10 pt-24">
        <div className="w-full max-w-md">
          <PhotoTicket
            marker={waypoint?.marker ?? null}
            waypointIndex={displayIndex}
            templateConfig={templateConfig}
          />

          {/* Metadata editor — only in configuring mode */}
          {status === 'configuring' && waypoint && (
            <MetadataEditor
              key={waypoint.id}
              photoId={waypoint.id}
              currentTitle={waypoint.marker.photo.title}
              currentDateTaken={waypoint.marker.photo.dateTaken}
            />
          )}

          {/* Journal caption — below the polaroid */}
          <AnimatePresence mode="wait">
            <m.div
              key={displayIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mt-12 px-2"
            >
              {waypoint?.marker.photo.title && (
                <h3 className="truncate font-serif text-[1.05rem] font-semibold tracking-[0.02em] text-black/90 dark:text-white/90">
                  {waypoint.marker.photo.title}
                </h3>
              )}
              {waypoint?.marker.photo.description && (
                <p className="mt-1.5 font-serif text-[0.85rem] italic leading-[1.7] text-black/70 dark:text-white/70">
                  {waypoint.marker.photo.description}
                </p>
              )}
              <p className={`${waypoint?.marker.photo.title || waypoint?.marker.photo.description ? 'mt-3' : ''} font-serif text-[0.85rem] italic leading-[1.7] text-black/90 dark:text-white/90`}>
                {quote}
              </p>
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
