import type { PropsWithChildren } from 'react'
import type { PhotoManifestItem } from '@/types/map'
import { Aperture, Camera, Focus, Timer } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'

export type PhotoManifest = PhotoManifestItem & { format?: string }
export const ScrollContext = createContext<HTMLElement | null>(null)
const PhotosContext = createContext<PhotoManifest[]>([])
const ViewerContext = createContext({ openViewer: (_index: number, _trigger?: HTMLElement) => {} })
export function LocalGalleryProvider({ photos, openViewer, children }: PropsWithChildren<{
  photos: PhotoManifest[]
  openViewer: (index: number, trigger?: HTMLElement) => void
}>) {
  return <PhotosContext value={photos}><ViewerContext value={{ openViewer }}>{children}</ViewerContext></PhotosContext>
}
export const useContextPhotos = () => useContext(PhotosContext)
export const usePhotoViewer = () => useContext(ViewerContext)
export const useScrollViewElement = () => useContext(ScrollContext)
export function useMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const query = matchMedia('(max-width: 767px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}
export const isMobileDevice = matchMedia('(pointer: coarse)').matches
export { Camera as CarbonIsoOutline, Timer as MaterialSymbolsShutterSpeed, Focus as StreamlineImageAccessoriesLensesPhotosCameraShutterPicturePhotographyPicturesPhotoLens, Aperture as TablerAperture }
export function formatExifData(_exif: PhotoManifest['exif']): null | { focalLength35mm?: string, aperture?: string, shutterSpeed?: string, iso?: string } {
  // Metadata remains available in Locusify's existing detail UI; no upstream formatter dependency.
  return null
}
export class ImageLoaderManager {
  private video?: HTMLVideoElement
  async processVideo(source: { type: string, videoUrl?: string, imageUrl?: string, offset?: number, size?: number, presentationTimestamp?: number }, video: HTMLVideoElement) {
    if (!source.videoUrl?.startsWith('blob:'))
      throw new Error('Only local paired video is available')
    this.video = video
    video.src = source.videoUrl
  }

  cleanup() {
    if (this.video) {
      this.video.pause()
      this.video.removeAttribute('src')
      this.video.load()
    }
  }
}
