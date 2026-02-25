import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { LazyImage } from '@/components/ui/lazy-image'
import { usePhotos } from '@/contexts'
import { formatCoordinates } from '@/lib/formatters'
import { cn, glassPanel } from '@/lib/utils'

interface GalleryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const GalleryDrawer: FC<GalleryDrawerProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation()
  const { photos, removePhoto, setSelectedMarkerId } = usePhotos()

  const handlePhotoClick = (photoId: string) => {
    setSelectedMarkerId(photoId)
    onOpenChange(false)
  }

  const handleRemove = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation()
    removePhoto(photoId)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] border-none bg-transparent backdrop-blur-none">
        <DrawerHeader className="hidden">
          <DrawerTitle>{t('menu.gallery')}</DrawerTitle>
          <DrawerDescription>{t('gallery.photo.count', { count: photos.length })}</DrawerDescription>
        </DrawerHeader>

        <div className={cn(glassPanel, 'flex flex-col overflow-hidden rounded-t-2xl')}>
          {/* Visible header */}
          <div className="flex items-center px-4 pt-4 pb-2 shrink-0">
            <h2 className="text-text text-base font-semibold">
              {t('menu.gallery')}
              <span className="text-text-secondary ml-2 text-sm font-normal">
                {t('gallery.photo.count', { count: photos.length })}
              </span>
            </h2>
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
                      <EmptyDescription>{t('gallery.empty.description')}</EmptyDescription>
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
                        <LazyImage
                          src={photo.preview}
                          alt={photo.name}
                          className="size-full"
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
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
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
      </DrawerContent>
    </Drawer>
  )
}
