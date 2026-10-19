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
      {/* 抽屉顶部已有「查看您的照片」标题，这里不再重复一遍大标题，
          只留真正新增的信息（选中几张、几张有 GPS） */}
      <div className="mb-6 text-center">
        {/* 这里原本还有一行「已选择 N 张，其中 M 张有 GPS」，
            与下方绿色横幅「N 张可用于生成路线」说的是同一件事，
            设计评审指出冗余，故只保留结论性更强的那条。 */}
        <m.p
          className="text-text-secondary text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('photos.preview.hint')}
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
                      <div className="flex items-center gap-1 text-2xs text-green-600 dark:text-green-400">
                        <i className="i-mingcute-location-line text-xs" />
                        <span>GPS</span>
                      </div>
                    )
                  : (
                      <div className="flex items-center gap-1 text-2xs text-amber-600 dark:text-amber-400">
                        <i className="i-mingcute-alert-line text-xs" />
                        <span>No GPS</span>
                      </div>
                    )}
              </div>
            </m.div>
          ))}
        </div>
      </div>

      {filesWithGPS.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <i className="i-mingcute-check-circle-fill text-base" />
          <span>{t('photos.preview.usable', { count: filesWithGPS.length })}</span>
        </div>
      )}

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
              <div className="mt-2 text-xs leading-relaxed text-red-700/80 dark:text-red-300/80">
                {t('photos.error.no.gps.help')}
              </div>
            </div>
          </div>
        </m.div>
      )}

      {/* Action buttons */}
      <m.div
        className="flex w-full gap-2 sm:gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          type="button"
          className="bg-fill-secondary text-text hover:bg-fill-tertiary flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors"
          onClick={onCancel}
          data-testid="route-cancel"
        >
          <i className="i-mingcute-arrow-left-line size-4" aria-hidden="true" />
          {t('photos.previous')}
        </button>
        <button
          type="button"
          disabled={filesWithGPS.length === 0}
          className={cn(
            'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap text-white transition-colors',
            filesWithGPS.length === 0
              ? 'bg-fill-tertiary text-text-secondary cursor-not-allowed'
              : 'bg-cyan-700 hover:bg-cyan-800 active:bg-cyan-900',
          )}
          onClick={onConfirm}
          data-testid="route-create"
        >
          <i className="i-mingcute-route-line size-4" aria-hidden="true" />
          {/* 不再带「（N 张）」：量词易被读成 N 条路线，且张数在上方
              绿色横幅已经写明，重复一次只会让按钮重心偏向文字 */}
          {t('photos.generateRouteEmpty')}
        </button>
      </m.div>
    </m.div>
  )
}
