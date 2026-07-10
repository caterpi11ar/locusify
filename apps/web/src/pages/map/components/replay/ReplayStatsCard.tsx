import { m } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { haversineDistance } from '@/lib/geo'
import { cn, glassPanel } from '@/lib/utils'
import { useReplayStore } from '@/stores/replayStore'

export function ReplayStatsCard() {
  const { t } = useTranslation()
  const waypoints = useReplayStore(s => s.waypoints)
  const status = useReplayStore(s => s.status)

  const stats = useMemo(() => {
    if (waypoints.length < 2)
      return null

    let totalDistanceKm = 0
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistanceKm += haversineDistance(waypoints[i].position, waypoints[i + 1].position)
    }

    const start = waypoints[0].timestamp
    const end = waypoints[waypoints.length - 1].timestamp
    const durationMs = end.getTime() - start.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    return {
      photoCount: waypoints.length,
      totalDistanceKm,
      durationHours,
      startDate: start,
      endDate: end,
    }
  }, [waypoints])

  if (status !== 'completed' || !stats)
    return null

  const statItems = [
    {
      icon: 'i-mingcute-camera-line',
      label: t('template.stats.photos'),
      value: `${stats.photoCount}`,
    },
    {
      icon: 'i-mingcute-route-line',
      label: t('template.stats.distance'),
      value: stats.totalDistanceKm >= 1
        ? `${stats.totalDistanceKm.toFixed(1)}`
        : `${(stats.totalDistanceKm * 1000).toFixed(0)}`,
      unit: stats.totalDistanceKm >= 1 ? 'km' : 'm',
    },
    {
      icon: 'i-mingcute-time-line',
      label: t('template.stats.duration'),
      value: stats.durationHours >= 1
        ? `${stats.durationHours.toFixed(1)}`
        : `${(stats.durationHours * 60).toFixed(0)}`,
      unit: stats.durationHours >= 1 ? 'hrs' : 'min',
    },
  ]

  const dateRange = stats.startDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  }) + (
    stats.startDate.toDateString() !== stats.endDate.toDateString()
      ? ` — ${stats.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : ''
  )

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className={cn(
        glassPanel,
        'pointer-events-auto absolute top-4 right-4 z-40',
        'w-[min(320px,calc(100%-2rem))]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/15">
            <i className="i-mingcute-compass-line text-base text-sky-400" />
          </div>
          <span className="text-xs font-semibold text-text">
            {t('template.stats.title')}
          </span>
        </div>
        <span className="text-[10px] text-text-tertiary">
          {dateRange}
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-fill-tertiary" />

      {/* Stats */}
      <div className="flex items-center justify-around px-4 py-4">
        {statItems.map((item, i) => (
          <m.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-1"
          >
            <i className={cn(item.icon, 'text-base text-sky-400')} />
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold leading-none text-text">
                {item.value}
              </span>
              {'unit' in item && item.unit && (
                <span className="text-[10px] text-text-secondary">
                  {item.unit}
                </span>
              )}
            </div>
            <span className="text-[10px] text-text-secondary">
              {item.label}
            </span>
          </m.div>
        ))}
      </div>
    </m.div>
  )
}
