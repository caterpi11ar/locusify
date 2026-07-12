import type { PendingVideo } from '@/hooks/useVideoRecorder'
import { m } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatFileSize } from '@/lib/formatters'
import { cn, glassPanel } from '@/lib/utils'

interface SaveVideoDialogProps {
  pendingVideo: PendingVideo | null
  isProcessing: boolean
  conversionProgress: number | null
  onSave: () => void
  onDiscard: () => void
}

export function SaveVideoDialog({ pendingVideo, isProcessing, conversionProgress, onSave, onDiscard }: SaveVideoDialogProps) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewUnsupported, setPreviewUnsupported] = useState(false)

  useEffect(() => {
    setPreviewUnsupported(false)

    if (!pendingVideo) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(pendingVideo.blob)
    setPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [pendingVideo])

  return (
    <m.div
      className="absolute inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <m.div
        className={cn(glassPanel, 'relative w-full max-w-[720px] overflow-hidden')}
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/15">
            <i className={`text-xl text-sky-400 ${isProcessing ? 'i-mingcute-loading-line animate-spin' : 'i-mingcute-video-camera-line'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-text text-sm font-semibold leading-tight">
              {pendingVideo
                ? t('workspace.recording.ready.title')
                : isProcessing
                  ? conversionProgress != null
                    ? t('workspace.recording.converting', { progress: Math.round(conversionProgress * 100) })
                    : t('workspace.recording.processing', { defaultValue: 'Processing video…' })
                  : t('workspace.recording.replayComplete', { defaultValue: 'Replay Complete' })}
            </p>
            {pendingVideo && (
              <p className="text-text-secondary mt-0.5 text-xs">
                {formatFileSize(pendingVideo.blob.size)}
              </p>
            )}
          </div>
        </div>

        {pendingVideo && previewUrl && (
          <div className="px-4 pb-4">
            <div className="bg-fill-secondary/60 relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
              <video
                controls
                playsInline
                preload="metadata"
                className="size-full bg-black object-contain"
                onError={() => setPreviewUnsupported(true)}
              >
                <source src={previewUrl} type={pendingVideo.mimeType} />
              </video>
            </div>
            {previewUnsupported && (
              <p className="text-text-secondary mt-2 text-xs leading-relaxed">
                {t('workspace.recording.previewUnsupported')}
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="bg-fill-tertiary mx-4 h-px" />

        {/* Actions */}
        <div className="flex gap-2 p-4">
          {pendingVideo && (
            <button
              type="button"
              onClick={onSave}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              <i className="i-mingcute-download-2-line text-base" />
              {t('workspace.recording.save')}
            </button>
          )}
          <button
            type="button"
            onClick={onDiscard}
            className="border-fill-tertiary text-text-secondary hover:text-text flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
          >
            {pendingVideo
              ? t('workspace.recording.discard')
              : t('workspace.recording.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </m.div>
    </m.div>
  )
}
