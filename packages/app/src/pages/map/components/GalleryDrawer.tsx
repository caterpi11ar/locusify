import type { FC } from 'react'
import { Drawer } from 'antd'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { LazyMedia } from '@/components/ui/lazy-media'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatCoordinates } from '@/lib/formatters'
import { cn, glassPanel } from '@/lib/utils'
import { usePhotoStore } from '@/stores/photoStore'

interface GalleryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modal?: boolean
  desktopOffset?: number
}

export const GalleryDrawer: FC<GalleryDrawerProps> = ({ open, onOpenChange, modal, desktopOffset = 0 }) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const photos = usePhotoStore(s => s.photos)
  const removePhoto = usePhotoStore(s => s.removePhoto)
  const setSelectedMarkerId = usePhotoStore(s => s.setSelectedMarkerId)

  const handlePhotoClick = (photoId: string) => {
    setSelectedMarkerId(photoId)
    onOpenChange(false)
  }

  const handleRemove = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation()
    removePhoto(photoId)
  }

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      placement={isMobile ? 'bottom' : 'left'}
      size={isMobile ? 'auto' : 480}
      mask={{ enabled: modal ?? isMobile, closable: modal ?? isMobile }}
      zIndex={!isMobile && modal === false ? 900 : undefined}
      closable={false}
      destroyOnHidden
      rootStyle={!isMobile ? { left: desktopOffset } : undefined}
      styles={{
        wrapper: isMobile ? { maxHeight: '80dvh' } : { height: '100dvh', width: 480 },
        body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
      }}
    >
      <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-l-none sm:rounded-r-2xl')}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-text text-base font-semibold">
              {t('menu.gallery')}
              <span className="text-text-secondary ml-2 text-sm font-normal">
                {t('gallery.photo.count', { count: photos.length })}
              </span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
            className="bg-fill-secondary hover:bg-fill-tertiary text-text/60 hover:text-text flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable photo grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0
            ? (
                <Empty className="border-fill-secondary my-4">
                  <EmptyMedia>
                    <i className="i-mingcute-photo-album-line text-text-tertiary size-10" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle className="text-text">{t('gallery.empty.title')}</EmptyTitle>
                    <EmptyDescription className="text-text-secondary">{t('gallery.empty.description')}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(photo => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => handlePhotoClick(photo.id)}
                      className="group relative aspect-square overflow-hidden rounded-lg focus:outline-none"
                    >
                      <LazyMedia
                        src={photo.preview}
                        alt={photo.name}
                        className="size-full"
                        videoSource={photo.videoSource}
                        imageFile={photo.file}
                        hoverToPlay
                        showBadge
                      />

                      {/* Remove button */}
                      <button
                        type="button"
                        aria-label={t('gallery.remove')}
                        onClick={e => handleRemove(e, photo.id)}
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 active:opacity-100"
                      >
                        <i className="i-mingcute-close-line size-3" />
                      </button>

                      {/* Location label */}
                      {photo.gpsInfo && (
                        <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/60 to-transparent px-1.5 py-1">
                          <p className="truncate text-left text-[10px] leading-tight text-white/90">
                            {formatCoordinates(photo.gpsInfo.latitude, photo.gpsInfo.longitude)}
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
        </div>
      </div>
    </Drawer>
  )
}
