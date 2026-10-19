import type { GPSCoordinates, VideoSource } from '@/types/map'
import type { Photo } from '@/types/photo'
import { Camera } from 'lucide-react'
import { m } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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

      // categorizeFiles 会静默丢弃既不是图片也不是视频的文件。
      // 不给反馈的话，用户选了文件却什么都没发生，无从判断哪里不对。
      const accepted = imageFiles.length + videoMap.size + standaloneVideos.length
      const rejected = fileArray.length - accepted
      if (rejected > 0) {
        toast.error(t('photos.validation.unsupported', {
          count: rejected,
          defaultValue: '{{count}} file(s) skipped — only images and videos are supported',
        }))
      }
      if (accepted === 0)
        return

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
        data-testid="photo-file-input"
        onChange={handleFileInputChange}
      />

      {/*
       * 整块就是一个 <button>。
       *
       * 之前是可点击 <div> 里再套一个 <button>：
       *  - div 带 onclick 键盘完全不可达（不是可聚焦元素）；
       *  - 同一件事有两个交互入口（点空白处 / 点蓝色按钮），语义含糊；
       *  - 违反界面规范里的「有 onClick 的 div 应用 <button>」。
       * 现在里面的胶囊是 <span>，只做视觉引导，不再是一个独立控件。
       *
       * 颜色全部改用应用的设计 token（text-text / fill-* / material-*）。
       * 原来用的是硬编码的 text-gray-*、bg-blue-600、bg-white，
       * 与同一条流程里的其它表面（如提示卡的 sky-400）凑出两种蓝。
       */}
      <button
        type="button"
        onClick={handleClick}
        aria-label={t('photos.choose.action')}
        aria-describedby="photo-dropzone-formats"
        className={cn(
          'group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl',
          'border border-dashed border-fill-tertiary bg-fill-tertiary/50 p-8 text-center',
          // 只过渡真正变化的属性。原来用的 transition-all 是明确的规范反例
          'transition-colors duration-200',
          'hover:border-fill-secondary hover:bg-fill-tertiary/60 active:bg-fill-secondary/60',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-fill-secondary text-text-secondary">
          <Camera size={22} strokeWidth={1.6} aria-hidden="true" />
        </span>

        {/* 不再重复抽屉标题（「选择照片」）；卡片只讲约束与操作 */}

        <span className="text-text max-w-[16rem] text-sm leading-relaxed text-pretty">
          {t('photos.select.requirement')}
        </span>

        <span
          className={cn(
            'mt-1 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap text-white',
            // cyan-700 而非 brand primary(#13ACF0)：白字在 #13ACF0 上只有 2.6:1，
            // 远低于 AA 的 4.5:1；#0e7490 实测 5.3:1 且同属品牌青色系。
            'bg-cyan-700 shadow-sm transition-colors duration-200 group-hover:bg-cyan-800',
          )}
        >
          {t('photos.choose.action')}
        </span>

        <span id="photo-dropzone-formats" className="text-text-secondary mt-1 text-xs">
          {t('photos.supported.formats')}
        </span>
      </button>

      {/* Dev mode: Mock metadata toggle */}
      {env.NODE_ENV === 'development' && (
        <m.div
          // dev-only 的调试开关：之前用高饱和琥珀色，视觉上抢主按钮的注意力。
          // 改成低调脚注（分隔线 + 次级文字），保留可辨识度但不参与视觉竞争。
          className="border-fill-quaternary mt-4 flex min-h-11 w-full items-center gap-2 border-t pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <input
            type="checkbox"
            id="mock-metadata"
            data-testid="mock-metadata-toggle"
            checked={useMockMetadata}
            onChange={e => setUseMockMetadata(e.target.checked)}
            className="size-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {/* 整个 label 都是点击区（htmlFor 把点击转发给 input），
              避免只有 16px 的小方块可点 */}
          <label
            htmlFor="mock-metadata"
            className="text-text-secondary cursor-pointer py-3.5 text-xs tracking-wide"
          >
            DEV: Use mock GPS metadata (Japan locations)
          </label>
        </m.div>
      )}
    </m.div>
  )
}
