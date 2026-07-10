import { AnimatePresence, m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import locusifyLogo from '@/assets/locusify.png'
import qrcodeImg from '@/assets/qrcode.jpeg'
import { useReplayStats } from '@/hooks/useReplayStats'
import { useReplayStore } from '@/stores/replayStore'
import { AnimatedNumber } from './AnimatedNumber'

/**
 * Bottom stats bar shown during trajectory playback.
 * Left: logo + brand name. Middle: 2 animated stats. Right: QR code.
 * Visible only when recording is active.
 */
export function TrajectoryStatsBar() {
  const { t } = useTranslation()
  const recordingActive = useReplayStore(s => s.recordingActive)
  const stats = useReplayStats()

  const isVisible = recordingActive

  const items = [
    {
      value: stats.durationDays,
      precision: 0,
      label: t('stats.bar.duration'),
      unit: t('stats.bar.durationUnit'),
    },
    {
      value: stats.totalDistanceKm,
      precision: 2,
      label: t('stats.bar.distance'),
      unit: t('stats.bar.distanceUnit'),
    },
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pointer-events-auto relative mx-2 mb-1 flex items-center gap-4 rounded-xl bg-black/60 px-4 py-3 backdrop-blur-sm"
        >
          {/* Left: Logo + brand — stacked on mobile, inline on desktop */}
          <div className="flex flex-col items-center gap-1 pr-4 sm:flex-row sm:gap-2">
            <img src={locusifyLogo} alt="" className="size-12 rounded sm:size-16" />
            <span className="text-[10px] font-semibold text-white sm:text-sm">Locusify</span>
          </div>

          {/* Middle: 2 stat items */}
          <div className="flex flex-1 justify-around">
            {items.map(item => (
              <div key={item.label} className="flex flex-col items-center">
                <div className="text-base font-semibold tabular-nums text-white">
                  <AnimatedNumber
                    value={item.value}
                    precision={item.precision}
                  />
                  {item.unit && (
                    <span className="ml-0.5 text-[10px] font-normal text-white/60">
                      {item.unit}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/60">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Right: QR code */}
          <div className="flex flex-col items-center gap-1 border-l border-white/15 pl-4">
            <img src={qrcodeImg} alt="QR" className="size-12 rounded sm:size-16" />
            <span className="text-[9px] text-white/60">{t('stats.bar.scanQr')}</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
