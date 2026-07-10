import { AnimatePresence, m } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, glassPanel } from '@/lib/utils'

interface OnboardingGuideProps {
  open: boolean
  onDismiss: () => void
}

export function OnboardingGuide({ open, onDismiss }: OnboardingGuideProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [step, setStep] = useState(0)
  const isTransitioning = useRef(false)

  const handleClick = useCallback(() => {
    if (isTransitioning.current)
      return
    isTransitioning.current = true
    setTimeout(() => {
      isTransitioning.current = false
    }, 300)

    if (step < 2) {
      setStep(step + 1)
    }
    else {
      onDismiss()
    }
  }, [step, onDismiss])

  if (!open)
    return null

  return (
    <m.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
    >
      <AnimatePresence mode="wait">
        {step === 0 && (
          <m.div
            key="step-0-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Spotlight — mirror MapMenuButton layout: same bottom/right/flex/gap, upload is 1st child */}
            <div className="pointer-events-none fixed bottom-3 right-2 flex flex-col-reverse gap-2 sm:bottom-4 sm:right-4 sm:gap-3">
              {/* Upload button position */}
              <div className="relative size-10 sm:size-12">
                {/* Shadow overlay */}
                <m.div
                  className="absolute -inset-1.5 rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
                />
                {/* Pulse ring */}
                <m.div
                  className="absolute -inset-1.5 rounded-2xl ring-2 ring-sky-400/80"
                  animate={{
                    boxShadow: [
                      '0 0 0 0px rgba(56,189,248,0.4)',
                      '0 0 0 8px rgba(56,189,248,0)',
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              </div>
              {/* Menu button spacer — 3rd child in MapMenuButton, sits at bottom in flex-col-reverse */}
              <div className="size-10 sm:size-12" />
            </div>

            {/* Step 1 card */}
            <m.div
              className={cn(glassPanel, 'fixed right-4 bottom-24 z-20 w-72 overflow-hidden sm:right-6 sm:bottom-28 sm:w-80')}
              initial={{ scale: 0.92, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/15">
                    <i className="i-mingcute-upload-2-line text-xl text-sky-400" />
                  </div>
                  <p className="text-text text-sm font-semibold leading-tight">
                    {t('guide.step1.title')}
                  </p>
                </div>
                <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                  {t('guide.step1.description')}
                </p>
              </div>

              <div className="bg-fill-tertiary mx-4 h-px" />

              <div className="flex items-center justify-between p-4">
                <StepIndicator current={0} total={3} />
                <span className="text-text-tertiary text-xs">
                  {t('guide.tapToContinue')}
                </span>
              </div>
            </m.div>
          </m.div>
        )}

        {step === 1 && (
          <m.div
            key="step-1-overlay"
            className="flex size-full items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Full-screen backdrop for step 2 */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Step 2 card — centered */}
            <m.div
              className={cn(glassPanel, 'relative z-10 w-72 overflow-hidden sm:w-80')}
              initial={{ scale: 0.92, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15">
                    {isMobile
                      ? <i className="i-mingcute-finger-tap-line text-xl text-emerald-400" />
                      : <i className="i-mingcute-mouse-line text-xl text-emerald-400" />}
                  </div>
                  <p className="text-text text-sm font-semibold leading-tight">
                    {t('guide.step2.title')}
                  </p>
                </div>
                <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                  {isMobile
                    ? t('guide.step2.description.mobile')
                    : t('guide.step2.description.desktop')}
                </p>
              </div>

              <div className="bg-fill-tertiary mx-4 h-px" />

              <div className="flex items-center justify-between p-4">
                <StepIndicator current={1} total={3} />
                <span className="text-text-tertiary text-xs">
                  {t('guide.tapToContinue')}
                </span>
              </div>
            </m.div>
          </m.div>
        )}

        {step === 2 && (
          <m.div
            key="step-2-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Spotlight — mirror MapControls layout: bottom-left, fragment mode is last button */}
            <div className="pointer-events-none fixed bottom-4 left-2 flex flex-col gap-2 sm:left-4 sm:gap-3">
              {/* Spacers for zoom group (2 buttons + divider) */}
              <div className="flex flex-col overflow-hidden">
                <div className="size-10 sm:size-12" />
                <div className="size-10 sm:size-12" />
              </div>
              {/* Compass spacer */}
              <div className="size-10 sm:size-12" />
              {/* Geolocate spacer */}
              <div className="size-10 sm:size-12" />
              {/* Fragment mode button position */}
              <div className="relative size-10 sm:size-12">
                {/* Shadow overlay */}
                <m.div
                  className="absolute -inset-1.5 rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
                />
                {/* Pulse ring */}
                <m.div
                  className="absolute -inset-1.5 rounded-2xl ring-2 ring-violet-400/80"
                  animate={{
                    boxShadow: [
                      '0 0 0 0px rgba(167,139,250,0.4)',
                      '0 0 0 8px rgba(167,139,250,0)',
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              </div>
            </div>

            {/* Step 3 card */}
            <m.div
              className={cn(glassPanel, 'fixed left-4 bottom-24 z-20 w-72 overflow-hidden sm:left-6 sm:bottom-28 sm:w-80')}
              initial={{ scale: 0.92, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15">
                    <i className="i-mingcute-earth-line text-xl text-violet-400" />
                  </div>
                  <p className="text-text text-sm font-semibold leading-tight">
                    {t('guide.step3.title')}
                  </p>
                </div>
                <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                  {t('guide.step3.description')}
                </p>
              </div>

              <div className="bg-fill-tertiary mx-4 h-px" />

              <div className="flex items-center justify-between p-4">
                <StepIndicator current={2} total={3} />
                <span className="text-text-tertiary text-xs">
                  {t('guide.tapToContinue')}
                </span>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

function StepIndicator({ current, total }: { current: number, total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'size-1.5 rounded-full transition-colors',
            i === current ? 'bg-sky-400' : 'bg-text-tertiary/40',
          )}
        />
      ))}
    </div>
  )
}
