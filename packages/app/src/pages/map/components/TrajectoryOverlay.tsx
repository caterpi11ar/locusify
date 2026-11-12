import type { ReplayTemplate, ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTemplateById } from '@/data/templates'
import { useReplayStore } from '@/stores/replayStore'
import { MetadataEditor } from './replay/MetadataEditor'
import { ReplayControls } from './replay/ReplayControls'
import { TemplateCustomizer } from './replay/TemplateCustomizer'
import { TemplateSelector } from './replay/TemplateSelector'

interface TrajectoryOverlayProps {
  onBeginRecording?: (onPlaybackStart: () => void) => Promise<boolean | undefined>
  onShowIntro?: (onComplete: () => void) => void
  onUpgradeClick?: () => void
}

/**
 * Overlay container for replay mode.
 * Contains editor controls outside the encoded surface. Photos, intro,
 * statistics and animations belong to the shared WebGL replay scene.
 */
export function TrajectoryOverlay({ onBeginRecording, onShowIntro, onUpgradeClick }: TrajectoryOverlayProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()

  const status = useReplayStore(s => s.status)
  const waypoint = useReplayStore(s => s.waypoints[Math.min(s.currentWaypointIndex, s.waypoints.length - 1)])
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

  // Actual start logic — called from template panel's "Start" button
  const handleStartReplay = useCallback(async () => {
    setShowCustomizePanel(false)
    confirmConfig()
    // Use the street replay flow at every map zoom level.
    const started = await onBeginRecording?.(() => {
      if (useReplayStore.getState().status === 'paused')
        useReplayStore.getState().togglePlayPause()
    })
    if (onBeginRecording && !started)
      return
    startEarthZoom()
  }, [confirmConfig, onBeginRecording, startEarthZoom])

  // Play button click:
  // - configuring: start with the current settings
  // - completed: restart (goes back to configuring → same flow)
  // - paused: resume via intro
  const handlePlayClick = useCallback(async () => {
    if (status === 'configuring' || (status === 'paused' && !recordingActive)) {
      await handleStartReplay()
    }
    else if (status === 'completed') {
      restartReplay()
    }
    else {
      // Pause-resume
      onShowIntro?.(() => {
        if (useReplayStore.getState().status === 'paused')
          useReplayStore.getState().togglePlayPause()
      })
      startEarthZoom()
    }
  }, [status, recordingActive, handleStartReplay, onShowIntro, restartReplay, startEarthZoom])

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
      {isConfiguring && waypoint && (
        <div
          className="pointer-events-auto absolute"
          style={{ left: 'calc(var(--replay-unit, 1px) * 82)', width: 'calc(var(--replay-unit, 1px) * 348)', top: 'calc(50% + var(--replay-unit, 1px) * 187)' }}
        >
          <MetadataEditor key={waypoint.id} photoId={waypoint.id} currentTitle={waypoint.marker.photo.title} currentDateTaken={waypoint.marker.photo.dateTaken} />
        </div>
      )}

      {/* Right workspace — panels and controls share normal document flow so they never overlap. */}
      {!recordingActive && (
        <div className="pointer-events-none relative z-40 flex min-h-0 flex-1 self-end flex-col justify-end gap-2 px-2 pb-2 sm:gap-3 sm:pb-4" style={{ width: 'calc(100% - var(--replay-unit, 1px) * 512)' }}>
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
