import type { ReplayTemplate, ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTemplateById } from '@/data/templates'
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
 * Intro animation is rendered at the MapSection level.
 * Photo panel is rendered as a split layout alongside the map.
 */
export function TrajectoryOverlay({ onBeginRecording, onShowIntro, onUpgradeClick }: TrajectoryOverlayProps) {
  const { t } = useTranslation()

  const status = useReplayStore(s => s.status)
  const recordingActive = useReplayStore(s => s.recordingActive)
  const templateId = useReplayStore(s => s.templateId)
  const templateConfig = useReplayStore(s => s.templateConfig)
  const setTemplate = useReplayStore(s => s.setTemplate)
  const setCustomOverrides = useReplayStore(s => s.setCustomOverrides)
  const confirmConfig = useReplayStore(s => s.confirmConfig)
  const restartReplay = useReplayStore(s => s.restartReplay)
  const startEarthZoom = useReplayStore(s => s.startEarthZoom)

  const isConfiguring = status === 'configuring'

  const [showCustomizePanel, setShowCustomizePanel] = useState(false)

  // Actual start logic — called from template panel's "Start" button
  const handleStartReplay = useCallback(async () => {
    setShowCustomizePanel(false)
    confirmConfig()
    // Use the street replay flow at every map zoom level.
    await onBeginRecording?.(() => {})
    startEarthZoom()
  }, [confirmConfig, onBeginRecording, startEarthZoom])

  // Play button click:
  // - configuring: open template panel
  // - completed: restart (goes back to configuring → same flow)
  // - paused: resume via intro
  const handlePlayClick = useCallback(async () => {
    if (status === 'configuring') {
      setShowCustomizePanel(prev => !prev)
    }
    else if (status === 'completed') {
      restartReplay()
    }
    else {
      // Pause-resume
      onShowIntro?.(() => {})
      startEarthZoom()
    }
  }, [status, onShowIntro, restartReplay, startEarthZoom])

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

      {/* Right workspace — panels and controls share normal document flow so they never overlap. */}
      {!recordingActive && (
        <div className="pointer-events-none relative z-40 flex min-h-0 w-3/5 flex-1 self-end flex-col justify-end gap-2 px-2 pb-2 sm:gap-3 sm:pb-4">
          <AnimatePresence mode="wait">
            {showCustomizePanel && (
              <m.div
                key="customize"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto min-h-0 overflow-y-auto rounded-2xl border border-fill-tertiary bg-white/95 p-4 shadow-2xl backdrop-blur-[120px] dark:bg-black/85"
              >
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomizePanel(false)
                    }}
                    className="flex size-7 items-center justify-center rounded-full text-text/60 transition-colors hover:bg-text/5 hover:text-text"
                  >
                    <i className="i-mingcute-arrow-left-line text-sm" />
                  </button>
                  <h2 className="text-sm font-semibold text-text">{t('template.customize.title')}</h2>
                </div>
                <TemplateCustomizer
                  config={templateConfig}
                  onChange={handleConfigChange}
                  templates={<TemplateSelector selectedId={templateId} onSelect={handleTemplateSelect} onUpgradeClick={handleUpgrade} />}
                />
                {isConfiguring && (
                  <button
                    type="button"
                    onClick={handleStartReplay}
                    className="mt-4 w-full rounded-xl bg-cyan-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
                  >
                    {t('workspace.config.start')}
                  </button>
                )}
              </m.div>
            )}
          </AnimatePresence>

          <div className="pointer-events-auto shrink-0">
            <ReplayControls
              onPlayClick={handlePlayClick}
              onCustomizeClick={() => {
                setShowCustomizePanel(prev => !prev)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
