import type { FC } from 'react'
import type { Photo } from '@/types/photo'
import { Drawer } from 'antd'
import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { LazyMedia } from '@/components/ui/lazy-media'
import { Masonry } from '@/features/afilmory/gallery/Masonic'
import { ScrollContext } from '@/features/afilmory/shared/local-gallery'
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
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)

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
      size={isMobile ? 'auto' : 720}
      mask={{ enabled: modal ?? isMobile, closable: modal ?? isMobile }}
      zIndex={!isMobile && modal === false ? 900 : undefined}
      closable={false}
      destroyOnHidden
      rootStyle={!isMobile ? { left: desktopOffset } : undefined}
      styles={{
        wrapper: isMobile ? { height: '100dvh', maxHeight: '100dvh' } : { height: '100dvh', width: `min(720px, calc(100vw - ${desktopOffset}px))` },
        body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
      }}
    >
      <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-r-2xl')}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
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
        <div ref={setScrollElement} className="relative min-h-0 flex-1 overflow-y-auto p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
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
                <ScrollContext value={scrollElement}>
                  <Masonry<Photo>
                    items={photos}
                    columnWidth={150}
                    columnGutter={8}
                    rowGutter={8}
                    itemHeightEstimate={220}
                    itemKey={photo => photo.id}
                    render={({ data: photo, width }) => (
                      <div className="group relative overflow-hidden rounded-xl" style={{ width, height: width * ((photo.height || 1) / (photo.width || 1)) }}>
                        <button type="button" aria-label={photo.name} onClick={() => handlePhotoClick(photo.id)} className="block size-full focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
                          <LazyMedia
                            src={photo.preview}
                            alt={photo.name}
                            className="size-full"
                            videoSource={photo.videoSource}
                            imageFile={photo.file}
                            hoverToPlay
                            showBadge
                          />
                        </button>

                        {/* Remove button */}
                        <button
                          type="button"
                          aria-label={t('gallery.remove')}
                          onClick={e => handleRemove(e, photo.id)}
                          className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        >
                          <i className="i-mingcute-close-line size-3" />
                        </button>

                        {/* Location label */}
                        {photo.gpsInfo && (
                          <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-linear-to-t from-black/60 to-transparent px-1.5 py-1">
                            <p className="truncate text-left text-2xs leading-tight text-white/90">
                              {formatCoordinates(photo.gpsInfo.latitude, photo.gpsInfo.longitude)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  />
                </ScrollContext>
              )}
        </div>
      </div>
    </Drawer>
  )
}
