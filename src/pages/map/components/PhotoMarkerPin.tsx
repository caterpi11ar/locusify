import type { FC } from 'react'
import type { PhotoMarker } from '@/types/map'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@radix-ui/react-hover-card'
import { m } from 'motion/react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Marker } from 'react-map-gl/maplibre'
import { GlassButton } from '@/components/ui/glass-button'
import { LazyImage } from '@/components/ui/lazy-image'
import { formatCoordinates, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { ClusterPhotoGrid } from './ClusterPhotoGrid'

interface PhotoMarkerPinProps {
  marker: PhotoMarker
  isSelected?: boolean
  onClick?: (marker: PhotoMarker) => void
  onClose?: () => void
  /** When provided, renders in cluster mode showing a photo grid */
  clusteredMarkers?: PhotoMarker[]
}

export const PhotoMarkerPin: FC<PhotoMarkerPinProps> = ({
  marker,
  isSelected = false,
  onClick,
  onClose,
  clusteredMarkers,
}) => {
  const { i18n } = useTranslation()
  const isCluster = !!clusteredMarkers && clusteredMarkers.length > 1

  const handleClick = () => {
    onClick?.(marker)
  }

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.()
  }, [onClose])

  return (
    <Marker
      key={marker.id}
      longitude={marker.longitude}
      latitude={marker.latitude}
      style={{ zIndex: isSelected ? 10 : 0 }}
    >
      <HoverCard
        open={isSelected}
        openDelay={400}
        closeDelay={100}
      >
        <HoverCardTrigger asChild>
          <m.div
            className="group relative cursor-pointer"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClick}
          >
            {/* Selection ring */}
            {isSelected && (
              <div className="bg-blue/30 absolute inset-0 -m-2 animate-pulse rounded-full" />
            )}

            {/* Photo background preview */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {marker.photo.thumbnailUrl && (
                <LazyImage
                  src={marker.photo.thumbnailUrl}
                  alt={marker.photo.title || marker.id}
                  className="size-full object-cover opacity-40"
                  rootMargin="100px"
                  threshold={0.1}
                />
              )}
              {/* Overlay */}
              <div className="from-green/60 to-emerald/80 dark:from-green/70 dark:to-emerald/90 absolute inset-0 bg-gradient-to-br" />
            </div>

            {/* Main marker container */}
            <div
              className={cn('relative flex size-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-xl', isSelected
                ? 'border-blue/40 bg-blue/90 shadow-blue/50 dark:border-blue/30 dark:bg-blue/80'
                : 'border-white/40 bg-white/95 hover:bg-white dark:border-white/20 dark:bg-black/80 dark:hover:bg-black/90')}
            >
              {/* Glass morphism overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5" />

              {/* Camera icon */}
              <i
                className={cn('i-mingcute-camera-line relative z-10 text-lg drop-shadow-sm', isSelected ? 'text-white' : 'text-gray-700 dark:text-white')}
              />

              {/* Subtle inner shadow for depth */}
              <div className="absolute inset-0 rounded-full shadow-inner shadow-black/5" />

              {/* Cluster count badge */}
              {isCluster && (
                <div className="bg-blue absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-black">
                  {clusteredMarkers!.length}
                </div>
              )}
            </div>
          </m.div>
        </HoverCardTrigger>

        <HoverCardContent
          className={cn('z-50 overflow-hidden border-white/20 bg-white/95 p-0 backdrop-blur-[120px] dark:bg-black/95', isCluster ? 'w-80' : 'w-56 sm:w-80', isSelected ? 'shadow-2xl' : '')}
          side="top"
          align="center"
          sideOffset={8}
          onPointerDownOutside={
            isSelected ? e => e.preventDefault() : undefined
          }
          onEscapeKeyDown={isSelected ? e => e.preventDefault() : undefined}
        >
          <div className="relative">
            {/* Close button when selected */}
            {isSelected && (
              <GlassButton
                className="absolute top-3 right-3 z-10 size-8"
                onClick={handleClose}
              >
                <i className="i-mingcute-close-line text-lg" />
              </GlassButton>
            )}

            {isCluster
              ? (
                  /* Cluster mode: photo grid */
                  <div className="p-4">
                    <ClusterPhotoGrid photos={clusteredMarkers!} />
                  </div>
                )
              : (
                  /* Single photo mode */
                  <>
                    {/* Photo header */}
                    <div className="relative h-32 overflow-hidden">
                      {marker.photo.thumbnailUrl && (
                        <LazyImage
                          src={marker.photo.thumbnailUrl}
                          alt={marker.photo.title || marker.id}
                          className="size-full object-cover"
                          rootMargin="200px"
                          threshold={0.1}
                        />
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="space-y-3 p-4">
                      {/* Title */}
                      <h3
                        className="text-text truncate text-sm font-semibold"
                        title={marker.photo.title || marker.id}
                      >
                        {marker.photo.title || marker.id}
                      </h3>

                      {/* Metadata */}
                      <div className="space-y-2">
                        {marker.photo.dateTaken && (
                          <div className="text-text-secondary flex items-center gap-2 text-xs">
                            <i className="i-mingcute-calendar-line text-sm" />
                            <span>
                              {formatDate(new Date(marker.photo.dateTaken), {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }, i18n.language)}
                            </span>
                          </div>
                        )}

                        {marker.photo.description && (
                          <div className="text-text-secondary flex items-center gap-2 text-xs">
                            <i className="i-mingcute-camera-line text-sm" />
                            <span className="truncate">{marker.photo.description}</span>
                          </div>
                        )}

                        <div className="text-text-secondary space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <i className="i-mingcute-location-line text-sm" />
                            <span className="font-mono">
                              {formatCoordinates(marker.latitude, marker.longitude, marker.latitudeRef, marker.longitudeRef)}
                            </span>
                          </div>
                          {marker.altitude !== undefined && (
                            <div className="flex items-center gap-2">
                              <i className="i-mingcute-mountain-2-line text-sm" />
                              <span className="font-mono">
                                <span>
                                  {marker.altitudeRef === 'Below Sea Level' ? '-' : ''}
                                </span>
                                <span>
                                  {Math.abs(marker.altitude).toFixed(1)}
                                  m
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </Marker>
  )
}
