import type { PhotoMarker } from '@/types/map'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { LazyImage } from '@/components/ui/lazy-image'
import { formatCoordinates, formatDate } from '@/lib/formatters'

interface ClusterPhotoGridProps {
  photos: PhotoMarker[]
  onPhotoClick?: (photo: PhotoMarker) => void
}

export function ClusterPhotoGrid({
  photos,
  onPhotoClick,
}: ClusterPhotoGridProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <h3 className="text-text text-sm font-semibold">
        {t('explory.cluster.photos', { count: photos.length })}
      </h3>

      {/* 横向滚动照片列表，每次展示 3 张 */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {photos.map((photoMarker, index) => (
          <m.div
            key={photoMarker.photo.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              duration: 0.4,
              bounce: 0,
              delay: index * 0.05,
            }}
            className="group relative aspect-square w-[90px] flex-none overflow-hidden rounded-lg"
          >
            <div
              onClick={() => onPhotoClick?.(photoMarker)}
              className="block size-full"
            >
              <LazyImage
                src={
                  photoMarker.photo.thumbnailUrl
                  || photoMarker.photo.originalUrl
                }
                alt={photoMarker.photo.title || photoMarker.photo.id}
                thumbHash={photoMarker.photo.thumbHash}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                rootMargin="200px"
                threshold={0.1}
              />

              {/* 悬停遮罩 */}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
            </div>
          </m.div>
        ))}
      </div>

      {/* 位置信息 */}
      {photos[0] && (
        <div className="border-border space-y-2 border-t pt-3">
          <div className="text-text-secondary flex items-center gap-2 text-xs">
            <i className="i-mingcute-location-line text-sm" />
            <span className="font-mono">
              {formatCoordinates(photos[0].latitude, photos[0].longitude, photos[0].latitudeRef, photos[0].longitudeRef)}
            </span>
          </div>

          {/* 拍摄时间范围 */}
          {(() => {
            const dates = photos
              .map(p => p.photo.exif?.DateTimeOriginal)
              .filter(Boolean)
              .map(d => new Date(d!))
              .sort((a, b) => a.getTime() - b.getTime())

            if (dates.length === 0)
              return null

            const earliest = dates[0]
            const latest = dates.at(-1)
            const isSameDay = earliest.toDateString() === latest?.toDateString()

            return (
              <div className="text-text-secondary flex items-center gap-2 text-xs">
                <i className="i-mingcute-calendar-line text-sm" />
                <span>
                  {isSameDay
                    ? formatDate(earliest, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }, i18n.language)
                    : `${formatDate(earliest, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }, i18n.language)} - ${latest
                      ? formatDate(latest, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }, i18n.language)
                      : ''}`}
                </span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
