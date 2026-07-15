import type { FC } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useWebShare } from '@/hooks/useWebShare'
import { cn, glassPanel } from '@/lib/utils'
import { UserPanel } from './UserPanel'

interface MenuItemProps {
  icon: string
  label: string
  onClick?: () => void
  disabled?: boolean
  tooltip?: string
}

interface MapMenuButtonProps {
  onUploadClick?: () => void
  onRoutesClick?: () => void
  onSettingsClick?: () => void
  onPricingClick?: () => void
  onLogout?: () => void
  onGalleryClick?: () => void
  /** Whether the routes button is disabled (e.g. no photos uploaded) */
  routesDisabled?: boolean
  /** Whether replay mode is active — shows exit button instead of menu */
  isReplayMode?: boolean
  /** Callback to exit replay mode */
  onExitReplay?: () => void
  /** Whether video is currently being recorded */
  isRecording?: boolean
  /** Whether recorded video is being processed */
  isProcessing?: boolean
  /** Whether to show the upload entry hint */
  showUploadHint?: boolean
}

/**
 * MapMenuButton component
 * @description A collapsible menu button in the bottom-right corner that expands upward
 */
export const MapMenuButton: FC<MapMenuButtonProps> = ({
  onUploadClick,
  onRoutesClick,
  onSettingsClick,
  onPricingClick,
  onLogout,
  onGalleryClick,
  routesDisabled,
  isReplayMode,
  onExitReplay,
  isRecording,
  isProcessing,
  showUploadHint,
}) => {
  const { t } = useTranslation()
  const { shareLink } = useWebShare()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showRoutesHint, setShowRoutesHint] = useState(false)
  const prevRoutesDisabled = useRef(routesDisabled)

  // Show hint tooltip when routes button first becomes available, until user clicks it
  useEffect(() => {
    if (prevRoutesDisabled.current && !routesDisabled) {
      setShowRoutesHint(true)
    }
    prevRoutesDisabled.current = routesDisabled
  }, [routesDisabled])

  const menuItems: MenuItemProps[] = [
    {
      icon: 'i-mingcute-add-line',
      label: t('menu.upload', { defaultValue: 'Upload Photos' }),
      onClick: () => {
        onUploadClick?.()
      },
    },
    {
      icon: 'i-mingcute-route-line',
      label: t('workspace.controls.viewReplay', { defaultValue: 'View Trajectory' }),
      onClick: () => {
        setShowRoutesHint(false)
        onRoutesClick?.()
      },
      disabled: routesDisabled,
    },
    {
      icon: 'i-mingcute-photo-album-line',
      label: t('menu.gallery', { defaultValue: 'Gallery' }),
      onClick: onGalleryClick,
    },
    {
      icon: 'i-mingcute-share-3-line',
      label: t('menu.share', { defaultValue: 'Share' }),
      onClick: () => {
        shareLink({
          title: t('share.appTitle', { defaultValue: 'Locusify' }),
          text: t('share.appText', { defaultValue: 'Transform your travel photos into visual route maps and cinematic vlogs' }),
          url: 'https://app.locusify.cn/',
        })
      },
    },
    {
      icon: 'i-mingcute-settings-3-line',
      label: t('settings.title', { defaultValue: 'Settings' }),
      onClick: onSettingsClick,
    },
  ]

  // Replay mode: exit button with optional recording indicator
  if (isReplayMode) {
    return (
      <m.div
        className="absolute top-3 left-2 z-40 sm:top-4 sm:left-4"
        style={{ paddingTop: 'var(--safe-area-top)', paddingLeft: 'var(--safe-area-left)' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(glassPanel, 'overflow-hidden')}>
              <button
                type="button"
                onClick={onExitReplay}
                className="group hover:bg-fill-secondary active:bg-fill-tertiary relative flex size-10 items-center justify-center transition-colors sm:size-12"
                title={t('workspace.controls.exit', { defaultValue: 'Exit Replay' })}
              >
                <i className="i-mingcute-close-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
                {/* Recording status dot */}
                {(isRecording || isProcessing) && (
                  <span className="absolute top-1.5 right-1.5 flex size-2 items-center justify-center sm:top-2 sm:right-2">
                    <span className={cn(
                      'absolute inline-flex size-full rounded-full',
                      isRecording ? 'animate-ping bg-red-400 opacity-60' : 'bg-amber-400',
                    )}
                    />
                    <span className={cn(
                      'relative inline-flex size-1.5 rounded-full',
                      isRecording ? 'bg-red-400' : 'bg-amber-400',
                    )}
                    />
                  </span>
                )}
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isRecording
              ? t('workspace.recording.recording')
              : isProcessing
                ? t('workspace.recording.processing')
                : t('workspace.controls.exit', { defaultValue: 'Exit Replay' })}
          </TooltipContent>
        </Tooltip>
      </m.div>
    )
  }

  return (
    <>
      <m.div
        className="absolute top-3 right-2 z-40 sm:hidden"
        style={{ paddingTop: 'var(--safe-area-top)', paddingRight: 'var(--safe-area-right)' }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className={cn(glassPanel, 'overflow-hidden')}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="group hover:bg-fill-secondary active:bg-fill-tertiary relative flex size-10 items-center justify-center transition-colors"
            title={t('menu.toggle', { defaultValue: 'Menu' })}
          >
            <i
              className={cn('text-text size-5 transition-all duration-300 group-hover:scale-110 group-active:scale-95', isExpanded ? 'i-mingcute-close-line rotate-180' : 'i-mingcute-menu-line')}
            />
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <m.div
              className={cn(glassPanel, 'absolute top-12 right-0 w-56 overflow-hidden')}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <UserPanel
                collapsed={false}
                variant="menuRow"
                contentSide="left"
                contentAlign="start"
                onSettingsClick={() => {
                  setIsExpanded(false)
                  onSettingsClick?.()
                }}
                onPricingClick={() => {
                  setIsExpanded(false)
                  onPricingClick?.()
                }}
                onLogout={() => {
                  setIsExpanded(false)
                  onLogout?.()
                }}
              />

              <div className="bg-fill-secondary h-px w-full" />

              <div className="p-1">
                {menuItems.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick?.()
                        setIsExpanded(false)
                      }
                    }}
                    className={cn(
                      'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors',
                      item.disabled
                        ? 'text-text/25 cursor-not-allowed'
                        : 'text-text/70 hover:bg-fill-secondary hover:text-text active:bg-fill-tertiary',
                    )}
                    title={item.label}
                  >
                    <i className={cn(item.icon, 'size-5 shrink-0')} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      <m.div
        className="absolute bottom-3 left-2 z-40 flex flex-col-reverse gap-2 sm:hidden"
        style={{ paddingBottom: 'var(--safe-area-bottom)', paddingLeft: 'var(--safe-area-left)' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="relative flex items-center">
          <AnimatePresence>
            {showUploadHint && (
              <m.div
                className="absolute left-full ml-2 whitespace-nowrap rounded-xl bg-black/80 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {t('menu.upload.hint', { defaultValue: 'Upload GPS photos to begin' })}
              </m.div>
            )}
          </AnimatePresence>

          <div data-onboarding="upload" className={cn(glassPanel, 'border-red/30 overflow-hidden')}>
            <button
              type="button"
              onClick={() => {
                onUploadClick?.()
              }}
              className="group hover:bg-red/10 active:bg-red/20 relative flex size-10 items-center justify-center transition-colors"
              title={t('menu.upload', { defaultValue: 'Upload Photos' })}
            >
              <i className="i-mingcute-add-line text-red size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!routesDisabled && (
            <m.div
              className="relative flex items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <AnimatePresence>
                {showRoutesHint && (
                  <m.div
                    className="absolute left-full ml-2 whitespace-nowrap rounded-xl bg-black/80 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t('workspace.controls.viewReplay', { defaultValue: 'View Trajectory' })}
                  </m.div>
                )}
              </AnimatePresence>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(glassPanel, 'overflow-hidden')}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoutesHint(false)
                        onRoutesClick?.()
                      }}
                      className="group hover:bg-fill-secondary active:bg-fill-tertiary flex size-10 items-center justify-center transition-colors"
                    >
                      <i className="i-mingcute-route-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('workspace.controls.viewReplay', { defaultValue: 'View Trajectory' })}
                </TooltipContent>
              </Tooltip>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </>
  )
}
