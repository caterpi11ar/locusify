import type { FC } from 'react'
import type { LivePhotoVideoHandle } from './LivePhotoVideo'
import { AnimatePresence, m } from 'motion/react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

interface LivePhotoBadgeProps {
  livePhotoRef: React.RefObject<LivePhotoVideoHandle | null>
  isLivePhotoPlaying: boolean
}

export const LivePhotoBadge: FC<LivePhotoBadgeProps> = ({ livePhotoRef, isLivePhotoPlaying }) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const handleClick = useCallback(() => {
    if (!livePhotoRef.current?.getIsVideoLoaded())
      return

    if (isLivePhotoPlaying) {
      livePhotoRef.current?.stop()
    }
    else {
      livePhotoRef.current?.play()
    }
  }, [livePhotoRef, isLivePhotoPlaying])

  return (
    <>
      {/* Live Photo badge */}
      <div
        className={cn(
          'absolute top-2 left-2 z-20 flex items-center space-x-1 rounded-xl bg-black/50 px-1 py-1 text-xs text-white transition-all duration-200',
          'cursor-pointer hover:bg-black/70',
          isLivePhotoPlaying && 'bg-accent/70 hover:bg-accent/80',
        )}
        onClick={handleClick}
      >
        <i
          className={cn('size-4', isLivePhotoPlaying ? 'i-mingcute-live-photo-fill' : 'i-mingcute-live-photo-line')}
        />
        <span className="mr-1">{t('photo.live.badge')}</span>
      </div>

      {/* Playing status indicator */}
      <AnimatePresence>
        {isLivePhotoPlaying && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
              <i className="i-mingcute-live-photo-fill" />
              <span>{t('photo.live.playing')}</span>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Hover tooltip */}
      <div
        className={cn(
          'pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs text-white opacity-0 duration-200 group-hover:opacity-50',
          isLivePhotoPlaying && 'opacity-0!',
        )}
      >
        {isMobile ? t('photo.live.tooltip.mobile') : t('photo.live.tooltip.desktop')}
      </div>
    </>
  )
}
