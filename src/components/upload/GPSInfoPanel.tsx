import type { Photo } from '@/types/photo'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { LazyMedia } from '@/components/ui/lazy-media'
import { cn } from '@/lib/utils'

interface GPSInfoPanelProps {
  files: Photo[]
  onConfirm: () => void
  onCancel: () => void
  onRemoveFile: (fileId: string) => void
}

export function GPSInfoPanel({
  files,
  onConfirm,
  onCancel,
  onRemoveFile,
}: GPSInfoPanelProps) {
  const { t } = useTranslation()

  const filesWithGPS = files.filter(f => f.gpsInfo)
  const filesWithoutGPS = files.filter(f => !f.gpsInfo)

  return (
    <m.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <m.h2
          className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('photos.preview.title')}
        </m.h2>
        <m.p
          className="text-sm text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {t('photos.preview.description', {
            total: files.length,
            withGPS: filesWithGPS.length,
          })}
        </m.p>
      </div>

      {/* Photos horizontal scroll */}
      <div className="mb-8 rounded-2xl bg-white/30 p-3 backdrop-blur-md dark:bg-black/20">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {files.map((file, index) => (
            <m.div
              key={file.id}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-gray-200/50 bg-white/50 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg dark:border-gray-700/50 dark:bg-gray-800/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              style={{ width: '120px' }}
            >
              {/* Remove button */}
              <button
                type="button"
                className="absolute top-1 right-1 z-10 flex size-6 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all hover:bg-red-600 group-hover:opacity-100"
                onClick={() => onRemoveFile(file.id)}
              >
                <i className="i-mingcute-close-line text-xs" />
              </button>

              {/* Image/Video preview */}
              <div className="aspect-square overflow-hidden">
                <LazyMedia
                  src={file.preview}
                  alt={file.name}
                  className="size-full transition-transform group-hover:scale-105"
                  videoSource={file.videoSource}
                  showBadge={false}
                  rootMargin="100px"
                  threshold={0.1}
                />
              </div>

              {/* File info - compact */}
              <div className="p-1.5">
                {/* GPS status badge */}
                {file.gpsInfo
                  ? (
                      <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                        <i className="i-mingcute-location-line text-xs" />
                        <span>GPS</span>
                      </div>
                    )
                  : (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                        <i className="i-mingcute-alert-line text-xs" />
                        <span>No GPS</span>
                      </div>
                    )}
              </div>
            </m.div>
          ))}
        </div>
      </div>

      {/* Warning for files without GPS */}
      {filesWithoutGPS.length > 0 && (
        <m.div
          className="mb-6 rounded-xl border border-amber-200/50 bg-amber-50/30 p-4 backdrop-blur-sm dark:border-amber-800/50 dark:bg-amber-950/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <i className="i-mingcute-alert-line mt-0.5 text-xl text-amber-600 dark:text-amber-400" />
            <div>
              <div className="mb-1 font-medium text-amber-900 dark:text-amber-100">
                {t('photos.warning.no.gps.title')}
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                {t('photos.warning.no.gps.description', {
                  count: filesWithoutGPS.length,
                })}
              </div>
            </div>
          </div>
        </m.div>
      )}

      {/* Error message for no GPS photos */}
      {filesWithGPS.length === 0 && (
        <m.div
          className="mb-6 rounded-xl border border-red-200/50 bg-red-50/30 p-4 backdrop-blur-sm dark:border-red-800/50 dark:bg-red-950/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <i className="i-mingcute-alert-line mt-0.5 text-xl text-red-600 dark:text-red-400" />
            <div>
              <div className="mb-1 font-medium text-red-900 dark:text-red-100">
                {t('photos.error.no.gps.title')}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {t('photos.error.no.gps.description')}
              </div>
            </div>
          </div>
        </m.div>
      )}

      {/* Action buttons */}
      <m.div
        className="flex justify-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-full border px-8 py-3 font-medium transition-all',
            'border-gray-300 bg-white text-gray-700',
            'hover:border-gray-400 hover:bg-gray-50',
            'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
            'dark:hover:border-gray-600 dark:hover:bg-gray-700',
          )}
          onClick={onCancel}
        >
          <i className="i-mingcute-arrow-left-line text-base" />
          {t('photos.previous')}
        </button>
        <button
          type="button"
          disabled={filesWithGPS.length === 0}
          className={cn(
            'flex items-center gap-2 rounded-full px-8 py-3 font-medium text-white shadow-lg transition-all',
            filesWithGPS.length === 0
              ? 'cursor-not-allowed bg-gray-400 dark:bg-gray-600'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl dark:bg-blue-500 dark:hover:bg-blue-600',
          )}
          onClick={onConfirm}
        >
          <i className="i-mingcute-check-line text-base" />
          {t('photos.confirm')}
          {' '}
          (
          {filesWithGPS.length}
          )
        </button>
      </m.div>
    </m.div>
  )
}
