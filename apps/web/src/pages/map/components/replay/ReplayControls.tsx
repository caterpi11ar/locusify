import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { TRANSPORT_MODES, transportModeIcons } from '@/data/transportModes'
import { formatCoordinates, formatDate, formatTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useReplayStore } from '@/stores/replayStore'

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 4]

interface ReplayControlsProps {
  onPlayClick?: () => void
  onTemplateClick?: () => void
  onCustomizeClick?: () => void
}

export function ReplayControls({ onPlayClick, onTemplateClick, onCustomizeClick }: ReplayControlsProps) {
  const { t } = useTranslation()

  const status = useReplayStore(s => s.status)
  const waypoints = useReplayStore(s => s.waypoints)
  const segments = useReplayStore(s => s.segments)
  const speedMultiplier = useReplayStore(s => s.speedMultiplier)
  const currentWaypointIndex = useReplayStore(s => s.currentWaypointIndex)
  const togglePlayPause = useReplayStore(s => s.togglePlayPause)
  const resetReplay = useReplayStore(s => s.resetReplay)
  const setSpeedMultiplier = useReplayStore(s => s.setSpeedMultiplier)
  const seekToWaypoint = useReplayStore(s => s.seekToWaypoint)
  const setSegmentMode = useReplayStore(s => s.setSegmentMode)

  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [transportPopoverIndex, setTransportPopoverIndex] = useState<number | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ left: number, top: number } | null>(null)
  const speedMenuRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([])
  const transportBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const transportPopoverRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to keep active node centered
  useEffect(() => {
    const container = timelineRef.current
    const activeNode = nodeRefs.current[currentWaypointIndex]
    if (!container || !activeNode)
      return

    const containerRect = container.getBoundingClientRect()
    const nodeRect = activeNode.getBoundingClientRect()
    const nodeCenter = nodeRect.left + nodeRect.width / 2 - containerRect.left + container.scrollLeft
    container.scrollTo({ left: nodeCenter - containerRect.width / 2, behavior: 'smooth' })
  }, [currentWaypointIndex])

  useEffect(() => {
    if (!speedMenuOpen)
      return
    function handleClickOutside(e: MouseEvent) {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node))
        setSpeedMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [speedMenuOpen])

  // Close transport popover on outside click
  useEffect(() => {
    if (transportPopoverIndex === null)
      return
    const idx = transportPopoverIndex
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        transportPopoverRef.current && !transportPopoverRef.current.contains(target)
        && !transportBtnRefs.current[idx]?.contains(target)
      ) {
        setTransportPopoverIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [transportPopoverIndex])

  // Compute popover position from the active transport button
  useEffect(() => {
    if (transportPopoverIndex === null) {
      setPopoverPos(null)
      return
    }
    const btn = transportBtnRefs.current[transportPopoverIndex]
    if (!btn)
      return
    const rect = btn.getBoundingClientRect()
    setPopoverPos({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    })
  }, [transportPopoverIndex])

  return (
    <>
      <div className="border-fill-tertiary flex flex-col rounded-xl border shadow-2xl backdrop-blur-[120px] sm:rounded-2xl bg-white/90 dark:bg-black/70">
        {/* Timeline */}
        <div
          ref={timelineRef}
          onScroll={() => setTransportPopoverIndex(null)}
          className="overflow-x-auto px-4 pt-3 pb-2 sm:px-6 sm:pt-4 sm:pb-3 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-text/15 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="flex min-w-full items-center">
            {waypoints.map((wp, i) => {
              const isActive = i === currentWaypointIndex
              const isPast = i < currentWaypointIndex
              const isLast = i === waypoints.length - 1
              const segment = segments[i]

              return (
                <div key={wp.id} className={cn('flex items-center', !isLast && 'flex-1')}>
                  {/* Waypoint node: dot + label as one clickable unit */}
                  <button
                    ref={(el) => { nodeRefs.current[i] = el }}
                    type="button"
                    onClick={() => seekToWaypoint(i)}
                    className={cn(
                      'group flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all sm:px-3 sm:py-2',
                      isActive
                        ? 'bg-text/5'
                        : 'hover:bg-text/5',
                    )}
                  >
                    {/* Dot */}
                    <div className="relative flex items-center justify-center">
                      {isActive && (
                        <m.div
                          className="absolute rounded-full bg-sky-400/20"
                          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{ width: 20, height: 20 }}
                        />
                      )}
                      <div
                        className={cn(
                          'relative z-10 rounded-full transition-all duration-300',
                          isActive
                            ? 'size-3 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)] sm:size-3.5'
                            : isPast
                              ? 'size-2 bg-sky-400/50 group-hover:bg-sky-400/70'
                              : 'size-2 bg-text/25 group-hover:bg-text/50',
                        )}
                      />
                    </div>

                    {/* Label */}
                    <div
                      className={cn(
                        'flex flex-col items-center gap-0.5 transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-80',
                      )}
                    >
                      <span
                        className={cn(
                          'whitespace-nowrap text-[10px] leading-none sm:text-[11px]',
                          isActive ? 'font-medium text-sky-400' : 'text-text/60',
                        )}
                      >
                        {formatDate(wp.timestamp)}
                        {' '}
                        {formatTime(wp.timestamp)}
                      </span>
                      <span
                        className={cn(
                          'whitespace-nowrap font-mono text-[9px] leading-none sm:text-[10px]',
                          isActive ? 'text-sky-300/70' : 'text-text/30',
                        )}
                      >
                        {formatCoordinates(wp.marker.latitude, wp.marker.longitude, wp.marker.latitudeRef, wp.marker.longitudeRef)}
                      </span>
                    </div>
                  </button>

                  {/* Connecting line with transport mode selector */}
                  {!isLast && segment && (
                    <div className="relative flex min-w-6 flex-1 items-center sm:min-w-12">
                      <div className={cn('h-px flex-1', isPast ? 'bg-sky-400/50' : 'bg-text/10')} />
                      <button
                        ref={(el) => { transportBtnRefs.current[i] = el }}
                        type="button"
                        onClick={() => setTransportPopoverIndex(prev => prev === i ? null : i)}
                        className={cn(
                          'z-10 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors',
                          isActive
                            ? 'bg-sky-400/20 text-sky-400'
                            : 'bg-fill-secondary text-text/60 hover:text-text',
                        )}
                        title={t(`settings.transport.${segment.mode}`)}
                      >
                        <i className={cn(transportModeIcons[segment.mode], 'size-3')} />
                      </button>
                      <div className={cn('h-px flex-1', isPast ? 'bg-sky-400/50' : 'bg-text/10')} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-text/8 sm:mx-4" />

        {/* Controls row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary text-[10px] sm:text-xs">
              {t('workspace.controls.progress', {
                current: Math.min(currentWaypointIndex + 1, waypoints.length),
                total: waypoints.length,
              })}
            </span>
            {onTemplateClick && (
              <button
                type="button"
                onClick={onTemplateClick}
                className="text-text-secondary hover:text-text flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] transition-colors hover:bg-text/5 sm:text-xs"
                title={t('template.selector.title')}
              >
                <i className="i-mingcute-grid-line text-xs" />
              </button>
            )}
            {onCustomizeClick && (
              <button
                type="button"
                onClick={onCustomizeClick}
                className="text-text-secondary hover:text-text flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] transition-colors hover:bg-text/5 sm:text-xs"
                title={t('template.customize.title')}
              >
                <i className="i-mingcute-settings-3-line text-xs" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={resetReplay}
              className="text-text-secondary hover:text-text flex size-6 items-center justify-center rounded-lg transition-colors sm:size-7"
              title={t('workspace.controls.reset')}
            >
              <i className="i-mingcute-refresh-2-line text-xs sm:text-sm" />
            </button>

            <button
              type="button"
              onClick={status === 'playing' ? togglePlayPause : onPlayClick}
              className="flex size-7 items-center justify-center rounded-full bg-sky-400 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:size-8"
              title={status === 'playing' ? t('workspace.controls.pause') : status === 'completed' ? t('workspace.controls.replay') : t('workspace.controls.play')}
            >
              <i className={cn(
                'text-base',
                status === 'playing'
                  ? 'i-mingcute-pause-fill'
                  : status === 'completed'
                    ? 'i-mingcute-refresh-2-line'
                    : 'i-mingcute-play-fill',
              )}
              />
            </button>

            <button
              type="button"
              onClick={() => seekToWaypoint(Math.min(currentWaypointIndex + 1, waypoints.length - 1))}
              className="text-text-secondary hover:text-text flex size-6 items-center justify-center rounded-lg transition-colors sm:size-7"
              title={t('workspace.controls.next')}
            >
              <i className="i-mingcute-skip-forward-fill text-xs sm:text-sm" />
            </button>
          </div>

          {/* Speed */}
          <div className="relative flex justify-end" ref={speedMenuRef}>
            <button
              type="button"
              onClick={() => setSpeedMenuOpen(prev => !prev)}
              className={cn(
                'flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                speedMenuOpen ? 'bg-text/10 text-sky-400' : 'text-text-secondary hover:text-text hover:bg-text/5',
              )}
            >
              <span>
                {speedMultiplier}
                x
              </span>
              <i className={cn('i-mingcute-down-line text-[10px] transition-transform', speedMenuOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {speedMenuOpen && (
                <m.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="border-fill-tertiary absolute bottom-full right-0 mb-2 min-w-[100px] overflow-hidden rounded-xl border py-1 shadow-2xl backdrop-blur-[120px] bg-white/90 dark:bg-black/70"
                >
                  {SPEED_OPTIONS.map(speed => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        setSpeedMultiplier(speed)
                        setSpeedMenuOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors',
                        speedMultiplier === speed ? 'text-sky-400' : 'text-text-secondary hover:text-text hover:bg-text/5',
                      )}
                    >
                      <span>
                        {speed}
                        x
                      </span>
                      {speedMultiplier === speed && <i className="i-mingcute-check-line text-sm" />}
                    </button>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Transport mode popover — portal to body */}
      {transportPopoverIndex !== null && popoverPos && createPortal(
        <div
          ref={transportPopoverRef}
          className="fixed z-[9999]"
          style={{
            left: popoverPos.left,
            top: popoverPos.top,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <AnimatePresence>
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="border-fill-tertiary flex items-center gap-1 rounded-xl border px-2 py-1.5 shadow-2xl backdrop-blur-[120px] bg-white/90 dark:bg-black/70"
            >
              {TRANSPORT_MODES.map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setSegmentMode(transportPopoverIndex, mode)
                    setTransportPopoverIndex(null)
                  }}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-lg transition-colors',
                    segments[transportPopoverIndex]?.mode === mode
                      ? 'bg-sky-400/20 text-sky-400'
                      : 'text-text/60 hover:bg-text/5 hover:text-text',
                  )}
                  title={t(`settings.transport.${mode}`)}
                >
                  <i className={cn(transportModeIcons[mode], 'size-4')} />
                </button>
              ))}
            </m.div>
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  )
}
