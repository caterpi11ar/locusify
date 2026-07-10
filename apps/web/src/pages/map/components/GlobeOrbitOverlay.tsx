import { m } from 'motion/react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { useReplayStore } from '@/stores/replayStore'

interface GlobeOrbitOverlayProps {
  onBeginRecording?: (onPlaybackStart: () => void) => Promise<void>
}

export function GlobeOrbitOverlay({ onBeginRecording }: GlobeOrbitOverlayProps) {
  const { t } = useTranslation()

  const status = useGlobeOrbitStore(s => s.status)
  const progress = useGlobeOrbitStore(s => s.progress)
  const togglePlayPause = useGlobeOrbitStore(s => s.togglePlayPause)
  const exitOrbit = useGlobeOrbitStore(s => s.exitOrbit)

  const recordingActive = useReplayStore(s => s.recordingActive)

  const isZooming = status === 'zooming'

  const handlePlayClick = useCallback(async () => {
    if (status === 'paused' && progress === 0) {
      // First play → start recording + intro, then begin orbit
      await onBeginRecording?.(() => togglePlayPause())
    }
    else {
      // Pause / resume — no recording restart
      togglePlayPause()
    }
  }, [status, progress, onBeginRecording, togglePlayPause])

  // Hide controls during active recording — only the map canvas is visible
  if (recordingActive) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end">
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Controls */}
      <div className="pointer-events-auto relative mx-2 pb-2 sm:pb-4">
        <div className="border-fill-tertiary flex flex-col rounded-xl border shadow-2xl backdrop-blur-[120px] sm:rounded-2xl bg-white/90 dark:bg-black/70">
          {/* Progress bar */}
          <div className="px-4 pt-3 sm:px-6 sm:pt-4">
            <div className="bg-text/10 h-1 w-full overflow-hidden rounded-full">
              <m.div
                className="h-full rounded-full bg-sky-400"
                style={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-text-tertiary text-[10px] sm:text-xs">
                {isZooming ? '...' : `${Math.round(progress * 360)}° / 360°`}
              </span>
              <span className="text-text-tertiary text-[10px] sm:text-xs">
                {isZooming ? '...' : `${Math.round(progress * 100)}%`}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-3 h-px bg-text/8 sm:mx-4" />

          {/* Controls row */}
          <div className="flex items-center justify-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5">
            {/* Exit */}
            <button
              type="button"
              onClick={exitOrbit}
              className="text-text-secondary hover:text-text flex size-7 items-center justify-center rounded-lg transition-colors sm:size-8"
              title={t('workspace.controls.exit')}
            >
              <i className="i-mingcute-close-line text-sm sm:text-base" />
            </button>

            {/* Play / Pause / Completed */}
            <button
              type="button"
              onClick={handlePlayClick}
              disabled={isZooming}
              className={cn(
                'flex size-8 items-center justify-center rounded-full bg-sky-400 text-white shadow-lg transition-transform sm:size-9',
                isZooming ? 'opacity-50' : 'hover:scale-105 active:scale-95',
              )}
              title={
                status === 'playing'
                  ? t('workspace.controls.pause')
                  : status === 'completed'
                    ? t('workspace.controls.replay')
                    : t('workspace.controls.play')
              }
            >
              <i className={cn(
                'text-base',
                status === 'playing'
                  ? 'i-mingcute-pause-fill'
                  : status === 'completed'
                    ? 'i-mingcute-check-fill'
                    : 'i-mingcute-play-fill',
              )}
              />
            </button>

            {/* Spacer to balance the layout */}
            <div className="size-7 sm:size-8" />
          </div>
        </div>
      </div>
    </div>
  )
}
