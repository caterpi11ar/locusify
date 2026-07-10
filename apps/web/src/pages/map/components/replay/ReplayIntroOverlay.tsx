import type { ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import locusifyLogo from '@/assets/locusify.png'

// Must match INTRO_MS in useVideoRecorder.ts
const FADE_IN_S = 0.7
const HOLD_MS = 1400
const FADE_OUT_S = 0.7

interface ReplayIntroOverlayProps {
  visible: boolean
  onExitComplete: () => void
  introStyle?: ReplayTemplateConfig['intro']['style']
  autoHide?: boolean // false → don't auto-dismiss, wait for visible=false from parent
}

export function ReplayIntroOverlay({ visible, onExitComplete, introStyle = 'logo-fade', autoHide = true }: ReplayIntroOverlayProps) {
  const [show, setShow] = useState(false)

  // Sync visible → show (including external close when autoHide=false)
  useEffect(() => {
    if (visible)
      setShow(true)
    else
      setShow(false)
  }, [visible])

  // Auto-dismiss after fade-in + hold — only when autoHide is enabled
  useEffect(() => {
    if (!show || !autoHide)
      return
    const t = setTimeout(setShow, FADE_IN_S * 1000 + HOLD_MS, false)
    return () => clearTimeout(t)
  }, [show, autoHide])

  // Skip intro entirely — fire callback in an effect to avoid side effects during render
  useEffect(() => {
    if (introStyle === 'none' && visible)
      onExitComplete()
  }, [introStyle, visible, onExitComplete])

  if (introStyle === 'none')
    return null

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {show && (
        <m.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_IN_S, ease: 'easeInOut' }}
        >
          {introStyle === 'logo-fade' && (
            <m.div
              className="flex flex-col items-center gap-5"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: FADE_OUT_S, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={locusifyLogo}
                alt="Locusify"
                className="size-20 rounded-2xl sm:size-24"
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
          )}

          {introStyle === 'title-card' && (
            <m.div
              className="flex flex-col items-center gap-3"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: FADE_OUT_S, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-px w-20 bg-white/30" />
              <span className="text-2xl font-light tracking-[0.2em] uppercase text-white sm:text-3xl">
                My Journey
              </span>
              <div className="h-px w-20 bg-white/30" />
            </m.div>
          )}

          {introStyle === 'map-zoom' && (
            <m.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: FADE_OUT_S * 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <i className="i-mingcute-map-line text-5xl text-white/60" />
              <span className="text-lg font-medium text-white/80 sm:text-xl">
                Locusify
              </span>
            </m.div>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
