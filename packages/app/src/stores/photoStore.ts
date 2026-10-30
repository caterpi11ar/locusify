import type { PhotoManifestItem, PhotoMarker } from '@/types/map'
import type { Photo } from '@/types/photo'
import { create } from 'zustand'

export function photoToManifestItem(photo: Photo): PhotoManifestItem {
  const cameraInfo = photo.camera
    ? [photo.camera.make, photo.camera.model].filter(Boolean).join(' ')
    : undefined

  return {
    id: photo.id,
    title: photo.name,
    dateTaken: photo.dateTaken || '',
    tags: [],
    description: cameraInfo || '',
    originalUrl: photo.preview,
    thumbnailUrl: photo.preview,
    thumbHash: null,
    width: photo.width || 0,
    height: photo.height || 0,
    aspectRatio: photo.width && photo.height ? photo.width / photo.height : 1,
    s3Key: '',
    lastModified: new Date(photo.lastModified).toISOString(),
    size: photo.size,
    exif: photo.exif || null,
    toneAnalysis: null,
    video: photo.videoSource,
  }
}

function deriveMarkers(photos: Photo[]): PhotoMarker[] {
  return photos
    .filter(photo => photo.gpsInfo)
    .map((photo) => {
      const gps = photo.gpsInfo!
      return {
        id: photo.id,
        latitude: gps.latitude,
        longitude: gps.longitude,
        altitude: gps.altitude,
        latitudeRef: gps.latitudeRef,
        longitudeRef: gps.longitudeRef,
        altitudeRef: gps.altitudeRef,
        photo: photoToManifestItem(photo),
      }
    })
}

function revokePhotoBlobUrls(photo: Photo): void {
  if (photo.preview.startsWith('blob:')) {
    URL.revokeObjectURL(photo.preview)
  }
  if (photo.videoSource && 'videoUrl' in photo.videoSource && photo.videoSource.videoUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(photo.videoSource.videoUrl)
  }
}

interface PhotoState {
  photos: Photo[]
  markers: PhotoMarker[]
  selectedMarkerId: string | null
  addPhotos: (files: Photo[]) => void
  removePhoto: (fileId: string) => void
  updatePhoto: (photoId: string, updates: Partial<Pick<Photo, 'dateTaken' | 'name'>>) => void
  clearPhotos: () => void
  setSelectedMarkerId: (id: string | null) => void
}

export const usePhotoStore = create<PhotoState>(set => ({
  photos: [],
  markers: [],
  selectedMarkerId: null,
  addPhotos: (files) => {
    set((state) => {
      const existingIds = new Set(state.photos.map(p => p.id))
      const retainedUrls = new Set(state.photos.flatMap(p => [p.preview, p.videoSource && 'videoUrl' in p.videoSource ? p.videoSource.videoUrl : undefined]))
      const newFiles = files.filter((photo) => {
        if (existingIds.has(photo.id)) {
          const urls = [photo.preview, photo.videoSource && 'videoUrl' in photo.videoSource ? photo.videoSource.videoUrl : undefined]
          for (const url of new Set(urls)) {
            if (url?.startsWith('blob:') && !retainedUrls.has(url))
              URL.revokeObjectURL(url)
          }
          return false
        }
        existingIds.add(photo.id)
        retainedUrls.add(photo.preview)
        if (photo.videoSource && 'videoUrl' in photo.videoSource)
          retainedUrls.add(photo.videoSource.videoUrl)
        return true
      })
      const photos = [...state.photos, ...newFiles]
      return { photos, markers: deriveMarkers(photos) }
    })
  },
  updatePhoto: (photoId, updates) => {
    set((state) => {
      const photos = state.photos.map(p =>
        p.id === photoId ? { ...p, ...updates } : p,
      )
      return { photos, markers: deriveMarkers(photos) }
    })
  },
  removePhoto: (fileId) => {
    set((state) => {
      const removed = state.photos.find(p => p.id === fileId)
      if (removed)
        revokePhotoBlobUrls(removed)
      const photos = state.photos.filter(p => p.id !== fileId)
      return {
        photos,
        markers: deriveMarkers(photos),
        selectedMarkerId: state.selectedMarkerId === fileId ? null : state.selectedMarkerId,
      }
    })
  },
  clearPhotos: () => {
    const { photos } = usePhotoStore.getState()
    photos.forEach(revokePhotoBlobUrls)
    set({ photos: [], markers: [], selectedMarkerId: null })
  },
  setSelectedMarkerId: id => set({ selectedMarkerId: id }),
}))
