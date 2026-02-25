import type { GPSCoordinates } from '@/types/map'
import type { Photo } from '@/types/photo'
import { m } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { env } from '@/lib/env'
import { extractExifData } from '@/lib/exif'
import { cn } from '@/lib/utils'
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

  // Handle file processing
  const processFiles = useCallback(
    async (fileList: FileList) => {
      const files: Photo[] = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]

        // Only accept image files
        if (!file.type.startsWith('image/')) {
          continue
        }

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
        }

        files.push(uploadFile)
      }

      onFilesSelected(files)
    },
    [onFilesSelected, useMockMetadata],
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
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0a0a0a"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
            />
            <circle cx="12" cy="13" r="3" />
          </svg>
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
