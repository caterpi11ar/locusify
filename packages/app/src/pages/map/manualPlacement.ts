import type { Photo } from '@/types/photo'
import { extractExifData } from '@/lib/exif'
import { categorizeFiles, getFilenameStem } from '@/lib/utils'
import { GPSDirection } from '@/types/map'

interface ManualPlacementParams {
  files: File[]
  longitude: number
  latitude: number
}

export async function buildPhotosForManualPlacement({
  files,
  longitude,
  latitude,
}: ManualPlacementParams): Promise<Photo[]> {
  const { imageFiles, videoMap, standaloneVideos } = categorizeFiles(files)
  const photos: Photo[] = []

  for (const file of imageFiles) {
    const preview = URL.createObjectURL(file)

    let dateTaken: string | undefined
    let camera: { make?: string, model?: string } | undefined
    const exif = (await extractExifData(file)) ?? undefined
    if (exif) {
      const dateTimeOriginal = exif.DateTimeOriginal
      const createDate = exif.CreateDate
      if (dateTimeOriginal) {
        dateTaken = dateTimeOriginal instanceof Date ? dateTimeOriginal.toISOString() : dateTimeOriginal
      }
      else if (createDate) {
        dateTaken = createDate instanceof Date ? createDate.toISOString() : createDate
      }
      if (exif.Make || exif.Model) {
        camera = { make: exif.Make, model: exif.Model }
      }
    }

    const stem = getFilenameStem(file.name).toLowerCase()
    const pairedVideo = videoMap.get(stem)

    photos.push({
      id: `${file.name}-${file.lastModified}`,
      file,
      preview,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      gpsInfo: {
        latitude,
        longitude,
        latitudeRef: latitude >= 0 ? GPSDirection.North : GPSDirection.South,
        longitudeRef: longitude >= 0 ? GPSDirection.East : GPSDirection.West,
      },
      exif: exif ?? undefined,
      dateTaken,
      camera,
      ...(pairedVideo && {
        videoFile: pairedVideo,
        videoSource: { type: 'live-photo' as const, videoUrl: URL.createObjectURL(pairedVideo) },
      }),
    })
  }

  for (const videoFile of standaloneVideos) {
    const preview = URL.createObjectURL(videoFile)

    photos.push({
      id: `${videoFile.name}-${videoFile.lastModified}`,
      file: videoFile,
      preview,
      name: videoFile.name,
      size: videoFile.size,
      type: videoFile.type,
      lastModified: videoFile.lastModified,
      gpsInfo: {
        latitude,
        longitude,
        latitudeRef: latitude >= 0 ? GPSDirection.North : GPSDirection.South,
        longitudeRef: longitude >= 0 ? GPSDirection.East : GPSDirection.West,
      },
      videoFile,
      videoSource: { type: 'video' as const, videoUrl: preview },
    })
  }

  return photos
}
