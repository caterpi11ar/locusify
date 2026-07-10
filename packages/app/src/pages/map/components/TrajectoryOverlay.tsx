import type { ReplayTemplate, ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTemplateById } from '@/data/templates'
import { cn } from '@/lib/utils'
import { useRegionStore } from '@/stores/regionStore'
import { useReplayStore } from '@/stores/replayStore'
import { PhotoPanel } from './replay/PhotoPanel'
import { ReplayControls } from './replay/ReplayControls'
import { TemplateCustomizer } from './replay/TemplateCustomizer'
import { TemplateSelector } from './replay/TemplateSelector'
import { TrajectoryStatsBar } from './replay/TrajectoryStatsBar'

interface TrajectoryOverlayProps {
  onBeginRecording?: (onPlaybackStart: () => void) => Promise<void>
  onShowIntro?: (onComplete: () => void) => void
  onUpgradeClick?: () => void
}

/**
 * Overlay container for replay mode.
 * Contains the template config UI, text overlay, stats, and bottom controls.
 * Intro animation is now rendered at the MapSection level (shared with globe orbit).
 * Photo panel is rendered as a split layout alongside the map.
 */
export function TrajectoryOverlay({ onBeginRecording, onShowIntro, onUpgradeClick }: TrajectoryOverlayProps) {
  const { t } = useTranslation()

  const status = useReplayStore(s => s.status)
  const togglePlayPause = useReplayStore(s => s.togglePlayPause)
  const recordingActive = useReplayStore(s => s.recordingActive)
  const templateId = useReplayStore(s => s.templateId)
  const templateConfig = useReplayStore(s => s.templateConfig)
  const setTemplate = useReplayStore(s => s.setTemplate)
  const setCustomOverrides = useReplayStore(s => s.setCustomOverrides)
  const confirmConfig = useReplayStore(s => s.confirmConfig)
  const restartReplay = useReplayStore(s => s.restartReplay)
  const startEarthZoom = useReplayStore(s => s.startEarthZoom)
  const isFragmentMode = useRegionStore(s => s.isFragmentMode)

  const isConfiguring = status === 'configuring'

  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [showCustomizePanel, setShowCustomizePanel] = useState(false)

  // Actual start logic — called from template panel's "Start" button
  const handleStartReplay = useCallback(async () => {
    setShowTemplatePanel(false)
    setShowCustomizePanel(false)
    confirmConfig()
    if (!isFragmentMode) {
      onBeginRecording?.(() => {})
      startEarthZoom()
    }
    else {
      await onBeginRecording?.(() => togglePlayPause())
    }
  }, [confirmConfig, isFragmentMode, onBeginRecording, startEarthZoom, togglePlayPause])

  // Play button click:
  // - configuring: open template panel
  // - completed: restart (goes back to configuring → same flow)
  // - paused: resume via intro
  const handlePlayClick = useCallback(async () => {
    if (status === 'configuring') {
      setShowTemplatePanel(prev => !prev)
      setShowCustomizePanel(false)
    }
    else if (status === 'completed') {
      restartReplay()
    }
    else {
      // Pause-resume
      if (!isFragmentMode) {
        onShowIntro?.(() => {})
        startEarthZoom()
      }
      else {
        onShowIntro?.(() => togglePlayPause())
      }
    }
  }, [status, onShowIntro, restartReplay, togglePlayPause, isFragmentMode, startEarthZoom])

  const handleTemplateSelect = useCallback((template: ReplayTemplate) => {
    setTemplate(template.id, template.config)
  }, [setTemplate])

  const handleConfigChange = useCallback((config: ReplayTemplateConfig) => {
    const base = getTemplateById(templateId)
    if (!base)
      return
    const overrides: Partial<ReplayTemplateConfig> = {}
    for (const key of Object.keys(config) as (keyof ReplayTemplateConfig)[]) {
      if (JSON.stringify(config[key]) !== JSON.stringify(base.config[key])) {
        (overrides as Record<string, unknown>)[key] = config[key]
      }
    }
    setCustomOverrides(overrides)
  }, [templateId, setCustomOverrides])

  const handleUpgrade = useCallback(() => {
    onUpgradeClick?.()
  }, [onUpgradeClick])

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-end">
      {/* Split layout — photo panel */}
      <PhotoPanel />

      {/* Stats bar — visible only during recording */}
      <div className="relative z-30">
        <TrajectoryStatsBar />
      </div>

      {/* Template panel — above controls, shown when play clicked during configuring OR via template button during playback */}
      <AnimatePresence>
        {showTemplatePanel && !showCustomizePanel && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-auto absolute left-[calc(40%+0.5rem)] right-2 z-40 max-h-[55vh] overflow-y-auto',
              'rounded-2xl border border-fill-tertiary bg-white/95 p-4 shadow-2xl backdrop-blur-[120px] dark:bg-black/85',
              isConfiguring ? 'bottom-28' : 'bottom-28',
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">{t('template.selector.title')}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowTemplatePanel(false)
                  setShowCustomizePanel(true)
                }}
                className="flex items-center gap-1 rounded-lg bg-text/5 px-2.5 py-1.5 text-[11px] font-medium text-text/60 transition-colors hover:bg-text/10 hover:text-text"
              >
                <i className="i-mingcute-settings-3-line text-xs" />
                {t('template.customize.title')}
              </button>
            </div>
            <TemplateSelector
              selectedId={templateId}
              onSelect={handleTemplateSelect}
              onUpgradeClick={handleUpgrade}
            />
            {isConfiguring && (
              <button
                type="button"
                onClick={handleStartReplay}
                className="mt-4 w-full rounded-xl bg-sky-400 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
              >
                {t('workspace.config.start')}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Customize panel */}
      <AnimatePresence>
        {showCustomizePanel && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-auto absolute left-[calc(40%+0.5rem)] right-2 z-40 max-h-[60vh] overflow-y-auto',
              'rounded-2xl border border-fill-tertiary bg-white/95 p-4 shadow-2xl backdrop-blur-[120px] dark:bg-black/85',
              'bottom-28',
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCustomizePanel(false)
                  if (isConfiguring)
                    setShowTemplatePanel(true)
                }}
                className="flex size-7 items-center justify-center rounded-lg text-text/60 transition-colors hover:bg-text/5 hover:text-text"
              >
                <i className="i-mingcute-arrow-left-line text-sm" />
              </button>
              <h2 className="text-sm font-semibold text-text">{t('template.customize.title')}</h2>
            </div>
            <TemplateCustomizer
              config={templateConfig}
              onChange={handleConfigChange}
            />
            {isConfiguring && (
              <button
                type="button"
                onClick={handleStartReplay}
                className="mt-4 w-full rounded-xl bg-sky-400 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
              >
                {t('workspace.config.start')}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient + controls — always shown except during recording */}
      {!recordingActive && (
        <div className="relative z-30">
          <div className="absolute bottom-0 left-[40%] right-0 h-48 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="pointer-events-auto relative ml-[calc(40%+0.5rem)] mr-2 pb-2 sm:pb-4">
            <ReplayControls
              onPlayClick={handlePlayClick}
              onTemplateClick={() => {
                setShowCustomizePanel(false)
                setShowTemplatePanel(prev => !prev)
              }}
              onCustomizeClick={() => {
                setShowTemplatePanel(false)
                setShowCustomizePanel(prev => !prev)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
