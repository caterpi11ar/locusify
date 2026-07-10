import type { GPSCoordinates, VideoSource } from '@/types/map'
import type { Photo } from '@/types/photo'
import { Camera } from 'lucide-react'
import { m } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { env } from '@/lib/env'
import { extractExifData } from '@/lib/exif'
import { categorizeFiles, cn, getFilenameStem } from '@/lib/utils'
import { convertExifGPSToDecimal } from '@/pages/map/utils'
import { GPSDirection } from '@/types/map'

// Mock GPS locations for dev testing (Japan locations)
const MOCK_GPS_LOCATIONS: GPSCoordinates[] = [
  { latitude: 35.6762, longitude: 139.6503, altitude: 40, latitudeRef: GPSDirection.North, longitudeRef: GPSDirection.East, altitudeRef: 'Above Sea Level' }, // Tokyo
  { latitude: 35.0116, longitude: 135.7681, altitude: 50, latitudeRef: GPSDirection.North, longitudeRef: GPSDirection.East, altitudeRef: 'Above Sea Level' }, // Kyoto
  { latitude: 34.6937, longitude: 135.5023, altitude: 10, latitudeRef: GPSDirection.North, longitudeRef: GPSDirection.East, altitudeRef: 'Above Sea Level' }, // Osaka
  { latitude: 43.0618, longitude: 141.3545, altitude: 25, latitudeRef: GPSDirection.North, longitudeRef: GPSDirection.East, altitudeRef: 'Above Sea Level' }, // Sapporo
  { latitude: 26.2124, longitude: 127.6809, altitude: 5, latitudeRef: GPSDirection.North, longitudeRef: GPSDirection.East, altitudeRef: 'Above Sea Level' }, // Okinawa
]

// Mock camera models for dev testing
const MOCK_CAMERAS = [
  { make: 'Apple', model: 'iPhone 15 Pro' },
  { make: 'Sony', model: 'ILCE-7M4' },
  { make: 'Canon', model: 'EOS R5' },
  { make: 'Fujifilm', model: 'X-T5' },
  { make: 'Nikon', model: 'Z8' },
]

// Generate mock date within last 30 days
function generateMockDate(index: number): string {
  const now = new Date()
  const daysAgo = Math.floor(index * 2) // Spread dates across trip
  const hoursOffset = Math.floor(Math.random() * 12)
  now.setDate(now.getDate() - daysAgo)
  now.setHours(9 + hoursOffset, Math.floor(Math.random() * 60), 0, 0)
  return now.toISOString()
}

interface PhotoSelectorProps {
  onFilesSelected: (files: Photo[]) => void
}

export function PhotoSelector({ onFilesSelected }: PhotoSelectorProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [useMockMetadata, setUseMockMetadata] = useState(false)

  // Process an array of File objects into Photo[]
  const processFileArray = useCallback(
    async (fileArray: File[]) => {
      const { imageFiles, videoMap, standaloneVideos } = categorizeFiles(fileArray)
      const files: Photo[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]

        // Create preview URL
        const preview = URL.createObjectURL(file)

        // Extract EXIF data using the browser-compatible extractExifData function
        const exif = await extractExifData(file)
        let gpsInfo: GPSCoordinates | undefined
        let dateTaken: string | undefined
        let camera: { make?: string, model?: string } | undefined

        // Use mock metadata in dev mode if enabled
        if (useMockMetadata && env.NODE_ENV === 'development') {
          gpsInfo = MOCK_GPS_LOCATIONS[i % MOCK_GPS_LOCATIONS.length]
          camera = MOCK_CAMERAS[i % MOCK_CAMERAS.length]
          dateTaken = generateMockDate(i)
        }
        else if (exif) {
          // Extract GPS coordinates
          gpsInfo = convertExifGPSToDecimal(exif) ?? undefined

          // Extract date taken (convert Date to string if needed)
          const dateTimeOriginal = exif.DateTimeOriginal
          const createDate = exif.CreateDate

          if (dateTimeOriginal) {
            dateTaken = dateTimeOriginal instanceof Date ? dateTimeOriginal.toISOString() : dateTimeOriginal
          }
          else if (createDate) {
            dateTaken = createDate instanceof Date ? createDate.toISOString() : createDate
          }

          // Extract camera info
          if (exif.Make || exif.Model) {
            camera = {
              make: exif.Make,
              model: exif.Model,
            }
          }
        }

        // Check for paired Live Photo video (Apple: filename matching)
        const stem = getFilenameStem(file.name).toLowerCase()
        const pairedVideo = videoMap.get(stem)
        let videoFile: File | undefined
        let videoSource: VideoSource | undefined

        if (pairedVideo) {
          videoFile = pairedVideo
          const videoUrl = URL.createObjectURL(pairedVideo)
          videoSource = { type: 'live-photo', videoUrl }
        }

        const uploadFile: Photo = {
          id: `${file.name}-${file.lastModified}`,
          file,
          preview,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          gpsInfo,
          exif: exif ?? undefined,
          dateTaken,
          camera,
          videoFile,
          videoSource,
        }

        files.push(uploadFile)
      }

      // Process standalone videos (no matching image → independent media)
      for (let i = 0; i < standaloneVideos.length; i++) {
        const videoFile = standaloneVideos[i]
        const preview = URL.createObjectURL(videoFile)
        const videoUrl = preview // video blob URL serves as both preview and source

        // Use mock metadata in dev mode if enabled (offset index by imageFiles.length)
        let gpsInfo: GPSCoordinates | undefined
        let dateTaken: string | undefined
        let camera: { make?: string, model?: string } | undefined

        if (useMockMetadata && env.NODE_ENV === 'development') {
          const idx = imageFiles.length + i
          gpsInfo = MOCK_GPS_LOCATIONS[idx % MOCK_GPS_LOCATIONS.length]
          camera = MOCK_CAMERAS[idx % MOCK_CAMERAS.length]
          dateTaken = generateMockDate(idx)
        }

        const uploadFile: Photo = {
          id: `${videoFile.name}-${videoFile.lastModified}`,
          file: videoFile,
          preview,
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type,
          lastModified: videoFile.lastModified,
          gpsInfo,
          dateTaken,
          camera,
          videoFile,
          videoSource: { type: 'video', videoUrl },
        }

        files.push(uploadFile)
      }

      onFilesSelected(files)
    },
    [onFilesSelected, useMockMetadata],
  )

  // Handle file processing from FileList (web file input)
  const processFiles = useCallback(
    async (fileList: FileList) => {
      const fileArray: File[] = []
      for (let i = 0; i < fileList.length; i++) {
        fileArray.push(fileList[i])
      }
      await processFileArray(fileArray)
    },
    [processFileArray],
  )

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        processFiles(files)
      }
    },
    [processFiles],
  )

  // Handle click to open file picker
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <m.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={handleFileInputChange}
      />

      {/* Click to select area */}
      <m.div
        className={cn(
          'relative flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 transition-all duration-300 backdrop-blur-sm',
          'border-gray-300/50 bg-white/30 hover:border-gray-400/50 hover:bg-white/40 dark:border-gray-600/50 dark:bg-black/20 dark:hover:border-gray-500/50 dark:hover:bg-black/30',
        )}
        onClick={handleClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Icon */}
        <m.div className="mb-6 text-6xl bg-white size-14 border-fill-tertiary rounded-2xl flex items-center justify-center">
          <Camera size={20} stroke="#0a0a0a" strokeWidth={1.8} />
        </m.div>

        {/* Title */}
        <m.h2
          className="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('photos.select.photos')}
        </m.h2>

        {/* Description */}
        <m.p
          className="mb-8 text-center text-sm text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {t('photos.select.hint')}
        </m.p>

        {/* Select button */}
        <m.button
          type="button"
          className="cursor-pointer rounded-full bg-blue-600 px-8 py-3 font-medium text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl dark:bg-blue-500 dark:hover:bg-blue-600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {t('photos.choose.files')}
        </m.button>

        {/* Supported formats */}
        <m.p
          className="mt-8 text-xs text-gray-500 dark:text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {t('photos.supported.formats')}
        </m.p>
      </m.div>

      {/* Dev mode: Mock metadata toggle */}
      {env.NODE_ENV === 'development' && (
        <m.div
          className="mt-4 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <input
            type="checkbox"
            id="mock-metadata"
            checked={useMockMetadata}
            onChange={e => setUseMockMetadata(e.target.checked)}
            className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="mock-metadata"
            className="text-xs text-amber-600 dark:text-amber-400"
          >
            DEV: Use mock GPS metadata (Japan locations)
          </label>
        </m.div>
      )}
    </m.div>
  )
}
