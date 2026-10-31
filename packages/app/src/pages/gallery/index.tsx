import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PhotoSelector } from '@/components/upload/PhotoSelector'
import { MasonryView } from '@/features/afilmory/gallery/MasonryView'
import { Maplibre } from '@/features/afilmory/map/ui/MapLibre'
import { LocalGalleryProvider, ScrollContext } from '@/features/afilmory/shared/local-gallery'
import { MapPhotoActionContext } from '@/features/afilmory/shared/local-map-action'
import { photoToManifestItem, usePhotoStore } from '@/stores/photoStore'

let savedScroll = 0
export default function GalleryPage() {
  const { i18n } = useTranslation()
  const zh = i18n.language.startsWith('zh')
  const label = (en: string, cn: string) => zh ? cn : en
  const photos = usePhotoStore(s => s.photos)
  const markers = usePhotoStore(s => s.markers)
  const selected = usePhotoStore(s => s.selectedMarkerId)
  const setSelected = usePhotoStore(s => s.setSelectedMarkerId)
  const addPhotos = usePhotoStore(s => s.addPhotos)
  const removePhoto = usePhotoStore(s => s.removePhoto)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const [view, setView] = useState<'photos' | 'map'>('photos')
  const [detail, setDetail] = useState(false)
  const [imageError, setImageError] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  const current = photos.find(photo => photo.id === selected)
  const items = useMemo(() => photos.map(photoToManifestItem), [photos])
  const openViewer = useCallback((index: number, element?: HTMLElement) => {
    trigger.current = element ?? null
    setSelected(items[index].id)
    setImageError(false)
    setDetail(true)
  }, [items, setSelected])
  useEffect(() => {
    if (!scrollElement)
      return
    scrollElement.scrollTop = savedScroll
    return () => {
      savedScroll = scrollElement.scrollTop
    }
  }, [scrollElement])
  useEffect(() => {
    if (!detail)
      return
    // No photo identity in URL/history payload
    // Back closes the local overlay.
    history.pushState({ galleryDetail: true }, '')
    const back = () => setDetail(false)
    window.addEventListener('popstate', back)
    return () => window.removeEventListener('popstate', back)
  }, [detail])
  const close = () => {
    setDetail(false)
    if (history.state?.galleryDetail)
      history.back()
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b p-4">
        <h1 className="mr-auto text-lg">
          {label('My photos', '我的照片')}
          {' '}
          ·
          {' '}
          {photos.length}
        </h1>
        <Button className={view === 'photos' ? '' : 'text-foreground'} aria-pressed={view === 'photos'} variant={view === 'photos' ? 'primary' : 'outline'} onClick={() => setView('photos')}>{label('Photos', '照片')}</Button>
        <Button className={view === 'map' ? '' : 'text-foreground'} aria-pressed={view === 'map'} variant={view === 'map' ? 'primary' : 'outline'} onClick={() => setView('map')}>{label('Map', '地图')}</Button>
        <Link className="p-3 underline" to={zh ? '/zh-CN/' : '/en/'}>{label('Journey workspace', '旅程工作区')}</Link>
      </header>
      <div ref={setScrollElement} className="relative min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className={view === 'photos' ? '' : 'hidden'}>
          <details className="mb-4" open={photos.length === 0}>
            <summary className="cursor-pointer py-3">{label('Add photos · processed only on this device', '添加照片 · 仅在此设备处理')}</summary>
            <PhotoSelector gallery onFilesSelected={addPhotos} />
          </details>
          {photos.length === 0 && <p className="py-8 text-center">{label('Add photos to start your journey', '添加照片，开始整理旅程')}</p>}
          <ScrollContext value={scrollElement}>
            <LocalGalleryProvider photos={items} openViewer={openViewer}>
              {photos.length > 0 && <MasonryView photos={items} />}
            </LocalGalleryProvider>
          </ScrollContext>
        </div>
        {view === 'map' && (
          <div className="relative h-full min-h-96">
            <p className="absolute top-2 left-2 z-40 rounded bg-background p-2 text-sm">{label('Offline overview · no street detail', '离线概览 · 不含街道细节')}</p>
            {markers.length === 0 && <p className="absolute top-16 left-2 z-40 bg-background p-2">{label('These photos have no location', '这些照片没有位置信息')}</p>}
            <MapPhotoActionContext value={(marker) => {
              setSelected(marker.id)
              setImageError(false)
              setDetail(true)
            }}
            >
              <Maplibre
                onSelectionClose={() => setSelected(null)}
                markers={markers}
                selectedMarkerId={selected}
                initialViewState={{ longitude: 0, latitude: 20, zoom: 1 }}
                onMarkerClick={(marker) => {
                  setSelected(marker.id)
                  setImageError(false)
                  setDetail(true)
                }}
              />
            </MapPhotoActionContext>
          </div>
        )}
      </div>
      <footer className="border-t p-3 text-xs">
        <details>
          <summary className="cursor-pointer">Powered by Afilmory · c392e06 · AGPL-3.0-or-later</summary>
          <p>Copyright (c) 2025 Afilmory Team. Local adaptation: 2026-10-30.</p>
          <p>{label('Local development only. Distribution license decision and corresponding-source publication pending.', '仅限本地开发。整体分发许可及对应源码发布待确认。')}</p>
          <a className="underline" href="/legal/afilmory-license.txt" target="_blank" rel="noreferrer">License</a>
          {' · '}
          <a className="underline" href="https://github.com/Afilmory/afilmory/tree/c392e065b03977fbe5fe256eb902121f0e4cdb30" target="_blank" rel="noreferrer">Upstream source c392e065b03977fbe5fe256eb902121f0e4cdb30</a>
        </details>
      </footer>
      <Dialog.Root
        open={detail && !!current}
        onOpenChange={(open) => {
          if (!open)
            close()
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Dialog.Content
            className="fixed inset-0 z-50 flex flex-col gap-3 bg-background p-4 pt-[max(1rem,env(safe-area-inset-top))] md:inset-8"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              trigger.current?.focus()
            }}
          >
            <Dialog.Title className="truncate pr-20">{current?.name}</Dialog.Title>
            <Dialog.Description>
              {current?.dateTaken || label('Date unknown', '日期未知')}
              {' '}
              ·
              {' '}
              {current?.gpsInfo ? label('Location available', '有位置信息') : label('No location', '无位置信息')}
            </Dialog.Description>
            <Button className="absolute top-4 right-4 text-foreground" onClick={close}>{label('Close', '关闭')}</Button>
            {imageError
              ? (
                  <div role="alert" className="flex-1 p-8">
                    {label('Unable to read this photo', '无法读取此照片')}
                    <Button onClick={() => setImageError(false)}>{label('Retry', '重试')}</Button>
                  </div>
                )
              : current?.type.startsWith('video/')
                ? <video className="min-h-0 flex-1 object-contain" src={current.preview} controls onError={() => setImageError(true)} />
                : <img className="min-h-0 flex-1 object-contain" src={current?.preview} alt={current?.name} onError={() => setImageError(true)} />}
            <div className="flex gap-2">
              <Button
                className="text-foreground"
                disabled={!current?.gpsInfo}
                onClick={() => {
                  close()
                  setView('map')
                }}
              >
                {label('Show on map', '在地图查看')}
              </Button>
              <Button
                className="text-foreground"
                variant="outline"
                onClick={() => {
                  if (current) {
                    close()
                    removePhoto(current.id)
                  }
                }}
              >
                {label('Remove', '移除')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
