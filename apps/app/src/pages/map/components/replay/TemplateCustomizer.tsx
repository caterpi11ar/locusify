import type { FilterType, ReplayTemplateConfig, TextOverlayStyle, TransitionType } from '@/types/template'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AudioManager from '@/lib/audio/AudioManager'
import { audioTracks } from '@/lib/audio/tracks'
import { cn } from '@/lib/utils'

interface TemplateCustomizerProps {
  config: ReplayTemplateConfig
  onChange: (config: ReplayTemplateConfig) => void
}

type Tab = 'music' | 'filter' | 'text' | 'transition' | 'speed' | 'line' | 'camera'

const FILTER_TYPES: FilterType[] = ['none', 'vintage', 'warm', 'cool', 'b&w', 'film', 'cinematic']
const TRANSITION_TYPES: TransitionType[] = ['cut', 'crossfade', 'slide-left', 'slide-up', 'zoom-in', 'blur']
const TEXT_STYLES: TextOverlayStyle[] = ['handwritten', 'minimal', 'bold', 'typewriter', 'neon']
const TEXT_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const

export function TemplateCustomizer({ config, onChange }: TemplateCustomizerProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('music')
  const [unavailableTracks, setUnavailableTracks] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkTracks = async () => {
      const results = await Promise.all(
        audioTracks
          .filter(t => t.id !== 'none')
          .map(async (track) => {
            const available = await AudioManager.probeTrack(track.id)
            return { id: track.id, available }
          }),
      )
      setUnavailableTracks(new Set(results.filter(r => !r.available).map(r => r.id)))
    }
    checkTracks()
  }, [])

  const tabs: { id: Tab, icon: string, label: string }[] = [
    { id: 'music', icon: 'i-mingcute-music-2-line', label: t('template.customize.music') },
    { id: 'filter', icon: 'i-mingcute-palette-line', label: t('template.customize.filter') },
    { id: 'text', icon: 'i-mingcute-text-line', label: t('template.customize.text') },
    { id: 'transition', icon: 'i-mingcute-transfer-line', label: t('template.customize.transition') },
    { id: 'speed', icon: 'i-mingcute-speed-line', label: t('template.customize.speed') },
    { id: 'line', icon: 'i-mingcute-route-line', label: t('template.customize.line') },
    { id: 'camera', icon: 'i-mingcute-video-camera-line', label: t('template.customize.camera') },
  ]

  const update = <K extends keyof ReplayTemplateConfig>(key: K, value: ReplayTemplateConfig[K]) => {
    onChange({ ...config, [key]: value })
  }

  // Resolve camera config with defaults for the UI
  const cameraConfig = {
    followMode: config.camera?.followMode ?? 'smart' as const,
    pitchEnabled: config.camera?.pitchEnabled !== false,
    bearingEnabled: config.camera?.bearingEnabled !== false,
    damping: config.camera?.damping ?? 0.08,
  }

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-sky-400/15 text-sky-400'
                : 'text-text/50 hover:bg-text/5 hover:text-text/70',
            )}
          >
            <i className={cn(tab.icon, 'text-sm')} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[120px]">
        {activeTab === 'music' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {audioTracks.map((track) => {
                const isUnavailable = track.id !== 'none' && unavailableTracks.has(track.id)
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => !isUnavailable && update('music', { ...config.music, trackId: track.id })}
                    className={cn(
                      'relative rounded-lg border px-2.5 py-2 text-[11px] transition-colors',
                      isUnavailable
                        ? 'cursor-default border-fill-tertiary opacity-40'
                        : config.music.trackId === track.id
                          ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                          : 'border-fill-tertiary text-text/60 hover:border-text/20',
                    )}
                  >
                    <span className={cn(isUnavailable && 'line-through')}>{t(track.nameKey)}</span>
                    {isUnavailable && (
                      <span className="absolute -top-1.5 -right-1 rounded-full bg-text/20 px-1 py-px text-[8px] text-text/50">
                        {t('template.music.unavailable')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.volume')}</span>
                <span>
                  {Math.round(config.music.volume * 100)}
                  %
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={config.music.volume * 100}
                onChange={e => update('music', { ...config.music, volume: Number(e.target.value) / 100 })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {FILTER_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update('filter', { ...config.filter, type })}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-[11px] capitalize transition-colors',
                    config.filter.type === type
                      ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                      : 'border-fill-tertiary text-text/60 hover:border-text/20',
                  )}
                >
                  {t(`template.filter.${type}`)}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.intensity')}</span>
                <span>
                  {Math.round(config.filter.intensity * 100)}
                  %
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={config.filter.intensity * 100}
                onChange={e => update('filter', { ...config.filter, intensity: Number(e.target.value) / 100 })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-[11px] text-text/60">{t('template.customize.textOverlay')}</span>
              <button
                type="button"
                onClick={() => update('textOverlay', { ...config.textOverlay, enabled: !config.textOverlay.enabled })}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  config.textOverlay.enabled ? 'bg-sky-400' : 'bg-text/20',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform',
                    config.textOverlay.enabled && 'translate-x-4',
                  )}
                />
              </button>
            </label>
            {config.textOverlay.enabled && (
              <>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-text/40">{t('template.customize.textStyle')}</span>
                  <div className="flex flex-wrap gap-1">
                    {TEXT_STYLES.map(style => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => update('textOverlay', { ...config.textOverlay, style })}
                        className={cn(
                          'rounded-lg border px-2 py-1 text-[10px] capitalize transition-colors',
                          config.textOverlay.style === style
                            ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                            : 'border-fill-tertiary text-text/60 hover:border-text/20',
                        )}
                      >
                        {t(`template.textStyle.${style}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-text/40">{t('template.customize.position')}</span>
                  <div className="flex flex-wrap gap-1">
                    {TEXT_POSITIONS.map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => update('textOverlay', { ...config.textOverlay, position: pos })}
                        className={cn(
                          'rounded-lg border px-2 py-1 text-[10px] transition-colors',
                          config.textOverlay.position === pos
                            ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                            : 'border-fill-tertiary text-text/60 hover:border-text/20',
                        )}
                      >
                        {t(`template.position.${pos}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={config.textOverlay.showDate}
                      onChange={e => update('textOverlay', { ...config.textOverlay, showDate: e.target.checked })}
                      className="accent-sky-400"
                    />
                    <span className="text-[10px] text-text/60">{t('template.customize.showDate')}</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={config.textOverlay.showLocation}
                      onChange={e => update('textOverlay', { ...config.textOverlay, showLocation: e.target.checked })}
                      className="accent-sky-400"
                    />
                    <span className="text-[10px] text-text/60">{t('template.customize.showLocation')}</span>
                  </label>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-text/40">{t('template.customize.customText')}</span>
                  <textarea
                    rows={2}
                    value={config.textOverlay.customText ?? ''}
                    onChange={e => update('textOverlay', { ...config.textOverlay, customText: e.target.value })}
                    placeholder={t('template.customize.customTextPlaceholder')}
                    className="w-full resize-none rounded-lg border border-fill-tertiary bg-transparent px-2.5 py-2 text-[11px] text-text placeholder:text-text/30 focus:outline-none focus:border-text/30"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'transition' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {TRANSITION_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update('transitions', { ...config.transitions, type })}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-[11px] transition-colors',
                    config.transitions.type === type
                      ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                      : 'border-fill-tertiary text-text/60 hover:border-text/20',
                  )}
                >
                  {t(`template.transition.${type}`)}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.transitionDuration')}</span>
                <span>
                  {config.transitions.duration}
                  ms
                </span>
              </label>
              <input
                type="range"
                min={50}
                max={1500}
                step={50}
                value={config.transitions.duration}
                onChange={e => update('transitions', { ...config.transitions, duration: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
          </div>
        )}

        {activeTab === 'speed' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.segmentDuration')}</span>
                <span>
                  {(config.segmentDuration / 1000).toFixed(1)}
                  s
                </span>
              </label>
              <input
                type="range"
                min={800}
                max={5000}
                step={100}
                value={config.segmentDuration}
                onChange={e => update('segmentDuration' as keyof ReplayTemplateConfig, Number(e.target.value) as never)}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.defaultSpeed')}</span>
                <span>
                  {config.defaultSpeed}
                  x
                </span>
              </label>
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.1}
                value={config.defaultSpeed}
                onChange={e => update('defaultSpeed' as keyof ReplayTemplateConfig, Number(e.target.value) as never)}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
          </div>
        )}

        {activeTab === 'line' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.lineColor')}</span>
              </label>
              <div className="flex gap-2">
                {['#38bdf8', '#f97316', '#a78bfa', '#d97706', '#06b6d4', '#22c55e', '#ef4444', '#ec4899'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => update('lineStyle', { ...config.lineStyle, color })}
                    className={cn(
                      'size-6 rounded-full border-2 transition-transform',
                      config.lineStyle.color === color ? 'scale-110 border-white' : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.lineWidth')}</span>
                <span>
                  {config.lineStyle.width}
                  px
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={config.lineStyle.width}
                onChange={e => update('lineStyle', { ...config.lineStyle, width: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={config.lineStyle.glow}
                  onChange={e => update('lineStyle', { ...config.lineStyle, glow: e.target.checked })}
                  className="accent-sky-400"
                />
                <span className="text-[10px] text-text/60">{t('template.customize.glow')}</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={config.lineStyle.animated}
                  onChange={e => update('lineStyle', { ...config.lineStyle, animated: e.target.checked })}
                  className="accent-sky-400"
                />
                <span className="text-[10px] text-text/60">{t('template.customize.animated')}</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-[10px] text-text/40">{t('template.customize.followMode')}</span>
              <div className="flex flex-wrap gap-1">
                {(['smart', 'fixed', 'topdown'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => update('camera', { ...cameraConfig, followMode: mode })}
                    className={cn(
                      'rounded-lg border px-2 py-1 text-[10px] capitalize transition-colors',
                      cameraConfig.followMode === mode
                        ? 'border-sky-400 bg-sky-400/10 text-sky-400'
                        : 'border-fill-tertiary text-text/60 hover:border-text/20',
                    )}
                  >
                    {t(`template.customize.followMode.${mode}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={cameraConfig.pitchEnabled}
                  onChange={e => update('camera', { ...cameraConfig, pitchEnabled: e.target.checked })}
                  className="accent-sky-400"
                />
                <span className="text-[10px] text-text/60">{t('template.customize.pitch')}</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={cameraConfig.bearingEnabled}
                  onChange={e => update('camera', { ...cameraConfig, bearingEnabled: e.target.checked })}
                  className="accent-sky-400"
                />
                <span className="text-[10px] text-text/60">{t('template.customize.bearing')}</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[11px] text-text/50">
                <span>{t('template.customize.damping')}</span>
                <span>{cameraConfig.damping.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0.01}
                max={0.2}
                step={0.01}
                value={cameraConfig.damping}
                onChange={e => update('camera', { ...cameraConfig, damping: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-text/10 accent-sky-400 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
