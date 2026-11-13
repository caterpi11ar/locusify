import type { ReplayTemplate, ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTemplateById } from '@/data/templates'
import { useReplayStore } from '@/stores/replayStore'
import { ReplayControls } from './replay/ReplayControls'
import { TemplateCustomizer } from './replay/TemplateCustomizer'
import { TemplateSelector } from './replay/TemplateSelector'

interface TrajectoryOverlayProps {
  presentationActive: boolean
  onBeginRecording?: (onPlaybackStart: () => void) => Promise<boolean | undefined>
  onShowIntro?: (onComplete: () => void) => void
  onUpgradeClick?: () => void
}

/**
 * Overlay container for replay mode.
 * Contains settings and playback controls outside the encoded surface.
 * ReplaySurfaceView owns the shared DOM photo panel and video compositor.
 */
export function TrajectoryOverlay({ presentationActive, onBeginRecording, onShowIntro, onUpgradeClick }: TrajectoryOverlayProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()

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

  const [showCustomizePanel, setShowCustomizePanel] = useState(true)

  // One playback session produces the video that is offered when it completes.
  const handleStartReplay = useCallback(async () => {
    setShowCustomizePanel(false)
    confirmConfig()
    const onPlaybackStart = () => {
      if (useReplayStore.getState().status === 'paused')
        useReplayStore.getState().togglePlayPause()
    }
    if (onBeginRecording) {
      const started = await onBeginRecording(onPlaybackStart)
      if (!started)
        return
    }
    else {
      onShowIntro?.(onPlaybackStart)
    }
    startEarthZoom()
  }, [confirmConfig, onBeginRecording, onShowIntro, startEarthZoom])

  const handlePlayClick = useCallback(() => {
    if (status === 'configuring' || (status === 'paused' && !recordingActive)) {
      handleStartReplay()
    }
    else if (status === 'completed') {
      restartReplay()
      handleStartReplay()
    }
    else {
      useReplayStore.getState().togglePlayPause()
    }
  }, [status, recordingActive, handleStartReplay, restartReplay])

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
      {/* Right workspace — panels and controls share normal document flow so they never overlap. */}
      {!presentationActive && (
        <div className="pointer-events-none relative z-40 flex min-h-0 w-3/5 flex-1 self-end flex-col justify-end gap-2 px-2 pb-2 sm:gap-3 sm:pb-4">
          <AnimatePresence mode="wait">
            {showCustomizePanel && (
              <m.div
                key="customize"
                id="replay-settings-panel"
                role="region"
                aria-labelledby="replay-settings-title"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className="pointer-events-auto min-h-0 overflow-y-auto rounded-2xl border border-fill-tertiary bg-white/95 p-4 shadow-2xl backdrop-blur-[120px] dark:bg-black/85"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id="replay-settings-title" className="text-sm font-semibold text-text">{t('template.customize.title')}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomizePanel(false)
                    }}
                    aria-label={t('template.customize.close')}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-text/60 transition-colors hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <i aria-hidden className="i-mingcute-close-line text-sm" />
                  </button>
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
              settingsOpen={showCustomizePanel}
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
