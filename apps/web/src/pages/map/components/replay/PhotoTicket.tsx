import type { PhotoMarker } from '@/types/map'
import type { ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m } from 'motion/react'
import { LazyMedia } from '@/components/ui/lazy-media'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { getFilterStyle } from '@/lib/replay/filters'
import { getTransitionVariants } from '@/lib/replay/transitions'

interface PhotoTicketProps {
  marker: PhotoMarker | null
  waypointIndex: number
  templateConfig: ReplayTemplateConfig
}

export function PhotoTicket({ marker, waypointIndex, templateConfig }: PhotoTicketProps) {
  if (!marker)
    return null

  const { photo } = marker
  const isPortrait = photo.width > 0 && photo.height > 0 && photo.height > photo.width
  const filterStyle = getFilterStyle(templateConfig.filter.type, templateConfig.filter.intensity)
  const transition = getTransitionVariants(templateConfig.transitions.type, templateConfig.transitions.duration)

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={waypointIndex}
        initial={transition.initial}
        animate={transition.animate}
        exit={transition.exit}
        transition={transition.transition}
        className="relative mx-auto w-full max-w-md"
      >
        {/* Tapes */}
        <div className="absolute -top-2 left-[12%] z-[200] h-7 w-20 -rotate-[8deg] bg-tape pointer-events-none" />
        <div className="absolute -top-2 right-[12%] z-[200] h-7 w-20 rotate-[6deg] bg-tape pointer-events-none" />

        <div
          className={`${isPortrait ? 'max-w-[70%]' : 'w-full'} mx-auto overflow-hidden rounded-sm bg-white p-3 pb-8 shadow-[0_4px_20px_rgba(0,0,0,0.25)]`}
          style={filterStyle ? { filter: filterStyle } : undefined}
        >
          {photo.thumbnailUrl && (
            <LazyMedia
              src={photo.thumbnailUrl}
              alt={photo.title || marker.id}
              className={`w-full ${isPortrait ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
              objectFit="cover"
              thumbHash={photo.thumbHash}
              videoSource={photo.video}
              rootMargin="200px"
              threshold={0.1}
            />
          )}

          {/* Bottom caption */}
          <div className="space-y-1.5 px-1 pt-2">
            <div className="flex items-baseline justify-between">
              {photo.dateTaken
                ? (
                    <span className="font-handwriting text-[0.65rem] text-[#444]">
                      {formatDate(new Date(photo.dateTaken), {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>
                  )
                : <span />}
              <span className="font-mono text-[0.5rem] text-[#999]">
                {formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef)}
              </span>
            </div>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  )
}
