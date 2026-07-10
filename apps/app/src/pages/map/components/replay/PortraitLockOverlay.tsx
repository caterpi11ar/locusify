import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const MQ = '(orientation: portrait) and (max-width: 639px)'

export function PortraitLockOverlay() {
  const { t } = useTranslation()
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined')
      return false
    return window.matchMedia(MQ).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(MQ)
    const onChange = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <AnimatePresence>
      {isPortrait && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-black"
        >
          <m.div
            animate={{ rotate: [0, -90, -90, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl text-white/80"
          >
            <i className="i-mingcute-cellphone-line" />
          </m.div>
          <p className="max-w-[240px] text-center text-sm text-white/60">
            {t('replay.rotateLandscape')}
          </p>
        </m.div>
      )}
    </AnimatePresence>
  )
}
