import { AnimatePresence, m } from 'motion/react'
import { LazyImage } from '@/components/ui/lazy-image'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { useReplayStore } from '@/stores/replayStore'

/**
 * Fixed overlay panel showing the current waypoint's photo during replay.
 * Positioned at the bottom-left of the screen, above map controls.
 */
export function ReplayPhotoCard() {
  const waypoints = useReplayStore(s => s.waypoints)
  const currentWaypointIndex = useReplayStore(s => s.currentWaypointIndex)

  const waypoint = waypoints[currentWaypointIndex] ?? null

  if (!waypoint)
    return null

  const { marker } = waypoint
  const { photo } = marker

  return (
    <div className="absolute top-3 right-2 z-40 sm:top-4 sm:right-4">
      <AnimatePresence mode="wait">
        <m.div
          key={marker.id}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="w-56 overflow-hidden rounded-xl border border-fill-tertiary shadow-2xl backdrop-blur-[80px] sm:w-80 lg:w-96 bg-white/90 dark:bg-black/80"
        >
          {/* Photo */}
          <div className="relative h-40 overflow-hidden sm:h-52 lg:h-64">
            {photo.thumbnailUrl && (
              <LazyImage
                src={photo.thumbnailUrl}
                alt={photo.title || marker.id}
                className="size-full object-cover"
                rootMargin="200px"
                threshold={0.1}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Time overlay on photo */}
            {photo.dateTaken && (
              <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-[10px] text-white/90 sm:text-xs">
                <i className="i-mingcute-calendar-line" />
                <span>
                  {formatDate(new Date(photo.dateTaken), {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-1.5 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <h4 className="truncate text-xs font-medium text-text sm:text-sm">
              {photo.title || marker.id}
            </h4>

            <div className="space-y-1 text-[10px] text-text/50 sm:text-xs">
              {photo.description && (
                <div className="flex items-center gap-1.5">
                  <i className="i-mingcute-camera-line shrink-0" />
                  <span className="truncate">{photo.description}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <i className="i-mingcute-location-line shrink-0" />
                <span className="font-mono">
                  {formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef)}
                </span>
              </div>
              {marker.altitude !== undefined && (
                <div className="flex items-center gap-1.5">
                  <i className="i-mingcute-mountain-2-line shrink-0" />
                  <span className="font-mono">
                    {marker.altitudeRef === 'Below Sea Level' ? '-' : ''}
                    {Math.abs(marker.altitude).toFixed(1)}
                    m
                  </span>
                </div>
              )}
            </div>
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  )
}
