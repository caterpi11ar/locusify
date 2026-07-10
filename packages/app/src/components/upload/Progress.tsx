import type { FC } from 'react'
import type { Photo } from '@/types/photo'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { LazyMedia } from '@/components/ui/lazy-media'
import { cn } from '@/lib/utils'

interface ProgressProps {
  files: Photo[]
  progress: Record<string, number>
  isComplete: boolean
}

export const Progress: FC<ProgressProps> = ({
  files,
  progress,
  isComplete,
}) => {
  const { t } = useTranslation()

  const overallProgress = files.length > 0
    ? files.reduce((sum, f) => sum + (progress[f.id] || 0), 0) / files.length
    : 0

  return (
    <m.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <m.div
          className="mb-4 text-6xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {isComplete ? '✅' : '⏳'}
        </m.div>
        <m.h2
          className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isComplete ? t('upload.complete.title') : t('upload.uploading.title')}
        </m.h2>
        <m.p
          className="text-sm text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isComplete
            ? t('upload.complete.description')
            : t('upload.uploading.description')}
        </m.p>
      </div>

      {/* Overall progress */}
      <m.div
        className="mb-8 rounded-2xl bg-white/30 p-8 backdrop-blur-md dark:bg-black/20"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">
            {t('upload.overall.progress')}
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(overallProgress)}
            %
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-gray-300/50 dark:bg-gray-600/50">
          <m.div
            className={cn(
              'h-full rounded-full transition-all duration-300 bg-gradient-to-r',
              isComplete
                ? 'from-green-500 to-emerald-500'
                : 'from-blue-500 to-blue-600',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* File count */}
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {isComplete
            ? t('upload.files.completed', { count: files.length })
            : t('upload.files.uploading', {
                completed: Object.values(progress).filter(p => p === 100).length,
                total: files.length,
              })}
        </div>
      </m.div>

      {/* Photo thumbnails grid */}
      <m.div
        className="grid grid-cols-4 gap-3 rounded-2xl bg-white/30 p-6 backdrop-blur-md dark:bg-black/20 md:grid-cols-6 lg:grid-cols-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        {files.map((file, index) => {
          const fileProgress = progress[file.id] || 0
          const isFileComplete = fileProgress === 100

          return (
            <m.div
              key={file.id}
              className="relative aspect-square overflow-hidden rounded-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.02 }}
            >
              <LazyMedia
                src={file.preview}
                alt={file.name}
                className="size-full"
                videoSource={file.videoSource}
                showBadge={false}
                rootMargin="100px"
                threshold={0.1}
              />

              {/* Status overlay */}
              {isFileComplete
                ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-[1px]">
                      <i className="i-mingcute-check-circle-fill text-2xl text-white drop-shadow-lg" />
                    </div>
                  )
                : (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30 backdrop-blur-[1px]">
                      <m.i
                        className="i-mingcute-loading-line text-2xl text-white drop-shadow-lg"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'linear',
                        }}
                      />
                    </div>
                  )}
            </m.div>
          )
        })}
      </m.div>

      {/* Complete message */}
      {isComplete && (
        <m.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('upload.complete.hint')}
          </p>
        </m.div>
      )}
    </m.div>
  )
}
