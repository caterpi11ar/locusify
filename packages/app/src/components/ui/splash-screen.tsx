import { m } from 'motion/react'
import locusifyLogo from '@/assets/locusify.png'

export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-950">
      <m.div
        className="flex flex-col items-center gap-5"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <m.img
          src={locusifyLogo}
          alt="Locusify"
          className="size-20 rounded-2xl sm:size-24"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Locusify
          </span>
          <span className="text-sm text-white/40 sm:text-base">
            Your Journey, Mapped
          </span>
        </div>
      </m.div>
    </div>
  )
}
