import type { ReplayTemplateConfig } from '@/types/template'
import { AnimatePresence, m } from 'motion/react'
import { useEffect } from 'react'
import { BrandLoading } from '@/components/ui/brand-loading'

const FADE_IN_S = 0.7

interface ReplayIntroOverlayProps {
  visible: boolean
  onExitComplete: () => void
  introStyle?: ReplayTemplateConfig['intro']['style']
}

export function ReplayIntroOverlay({ visible, onExitComplete, introStyle = 'logo-fade' }: ReplayIntroOverlayProps) {
  // Skip intro entirely — fire callback in an effect to avoid side effects during render
  useEffect(() => {
    if (introStyle === 'none' && visible)
      onExitComplete()
  }, [introStyle, visible, onExitComplete])

  if (introStyle === 'none')
    return null

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {visible && (
        <m.div
          data-testid="replay-intro"
          className="absolute inset-0 z-50"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_IN_S, ease: 'easeInOut' }}
        >
          <BrandLoading unit="var(--replay-unit, 1px)" />
        </m.div>
      )}
    </AnimatePresence>
  )
}
