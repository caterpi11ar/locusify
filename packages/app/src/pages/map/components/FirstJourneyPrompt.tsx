import { Modal } from 'antd'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, glassPanel } from '@/lib/utils'

interface EmptyJourneyPromptProps {
  open: boolean
  onSelectPhotos: () => void
  onUseDemo: () => void
  onStartReplay: () => void
  onClose: () => void
  canStartReplay: boolean
}

export function EmptyJourneyPrompt({ open, onSelectPhotos, onUseDemo, onStartReplay, onClose, canStartReplay }: EmptyJourneyPromptProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      mask={false}
      maskClosable={false}
      keyboard={false}
      centered
      width={640}
      destroyOnHidden
      closeIcon={<i className="i-mingcute-close-line text-text-secondary hover:text-text text-lg transition-colors" />}
      title={(
        <span id="first-journey-title" className="text-text block pr-12 text-lg font-semibold sm:text-xl">
          {t('onboarding.empty.title')}
        </span>
      )}
      styles={{
        container: {
          padding: 0,
          overflow: 'hidden',
          background: 'var(--color-material-opaque)',
          border: '1px solid var(--color-fill-tertiary)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.38)',
        },
        header: {
          margin: 0,
          padding: '16px 20px 14px',
          background: 'transparent',
          borderBottom: '1px solid var(--color-fill-tertiary)',
        },
        body: { padding: 20 },
      }}
    >
      <div className="grid items-stretch gap-5 sm:grid-cols-[1fr_240px]">
        <div className="flex flex-col justify-center text-center sm:text-left">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/20 to-violet-400/10 text-sky-400 ring-1 ring-sky-400/20 shadow-[0_12px_32px_rgba(56,189,248,0.12)] sm:mx-0">
            <i className="i-mingcute-route-line text-3xl" />
          </div>
          <p className="text-text-secondary max-w-sm text-sm leading-relaxed">
            {t('onboarding.empty.description')}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {canStartReplay
              ? (
                  <button
                    type="button"
                    onClick={onStartReplay}
                    className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-500"
                  >
                    <i className="i-mingcute-play-fill text-base" />
                    {t('onboarding.routeReady.startReplay')}
                  </button>
                )
              : (
                  <>
                    <button
                      type="button"
                      onClick={onSelectPhotos}
                      className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-sky-400 px-3 text-sm font-medium text-white transition-colors hover:bg-sky-500"
                    >
                      <i className="i-mingcute-upload-2-line text-base" />
                      {t('onboarding.empty.selectPhotos')}
                    </button>
                    <button
                      type="button"
                      onClick={onUseDemo}
                      className="border-fill-tertiary text-text-secondary hover:bg-fill-secondary hover:text-text inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors"
                    >
                      <i className="i-mingcute-play-circle-line text-base" />
                      {t('onboarding.empty.useDemo')}
                    </button>
                  </>
                )}
          </div>

          <p className="text-text-tertiary mt-3 flex items-center justify-center gap-1.5 text-xs sm:justify-start">
            <i className="i-mingcute-shield-line" />
            {t('onboarding.empty.privacy')}
          </p>
        </div>

        <ManualPlacementAnimation isMobile={isMobile} />
      </div>
    </Modal>
  )
}

function ManualPlacementAnimation({ isMobile }: { isMobile: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="relative mx-auto flex w-full max-w-[240px] flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400/10 via-fill-secondary/60 to-violet-400/10 p-3">
      <div className="relative h-32 overflow-hidden rounded-xl bg-[#111827]">
        {/* Simplified map lines */}
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(30deg,transparent_45%,rgba(125,211,252,.4)_46%,rgba(125,211,252,.4)_48%,transparent_49%),linear-gradient(120deg,transparent_58%,rgba(167,139,250,.35)_59%,rgba(167,139,250,.35)_61%,transparent_62%)]" />
        <m.div
          className="absolute top-[42%] left-[44%] size-3 rounded-full bg-sky-400 shadow-[0_0_0_6px_rgba(56,189,248,.15)]"
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Photo appears at the selected map point */}
        <m.div
          className="absolute top-4 right-5 flex h-16 w-14 rotate-3 items-center justify-center rounded-md border-2 border-white bg-gradient-to-br from-amber-300 to-rose-400 shadow-xl"
          animate={{ opacity: [0, 0, 1, 1, 0], y: [-12, -12, 22, 22, 28], scale: [0.8, 0.8, 1, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.25, 0.45, 0.82, 1] }}
        >
          <i className="i-mingcute-pic-line text-xl text-white" />
        </m.div>

        {/* Right-click / long-press gesture */}
        <m.div
          className="absolute top-[48%] left-[48%] flex size-9 items-center justify-center rounded-full bg-white text-neutral-900 shadow-xl"
          animate={{ x: [48, 48, 0, 0, 48], y: [45, 45, 0, 0, 45], scale: [1, 0.82, 0.82, 1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.42, 0.65, 1] }}
        >
          <i className={isMobile ? 'i-mingcute-finger-tap-line text-lg' : 'i-mingcute-mouse-line text-lg'} />
          <m.span
            className="absolute inset-0 rounded-full border-2 border-sky-400"
            animate={{ scale: [1, 1, 2], opacity: [0, 0.8, 0] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.62] }}
          />
        </m.div>
      </div>
      <div className="mt-2.5 text-center">
        <p className="text-text text-xs font-medium">{t('onboarding.empty.manual.title')}</p>
        <p className="text-text-secondary mt-1 text-xs leading-relaxed">
          {isMobile ? t('onboarding.empty.manual.mobile') : t('onboarding.empty.manual.desktop')}
        </p>
      </div>
    </div>
  )
}

interface RouteReadyPromptProps {
  photoCount: number
  onStartReplay: () => void
  onDismiss: () => void
}

export function RouteReadyPrompt({ photoCount, onStartReplay, onDismiss }: RouteReadyPromptProps) {
  const { t } = useTranslation()

  return (
    <m.section
      aria-live="polite"
      className={cn(glassPanel, 'pointer-events-auto absolute bottom-4 left-1/2 z-30 w-[min(calc(100vw-2rem),420px)] -translate-x-1/2 bg-material-opaque/95 p-4 sm:bottom-6')}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
          <i className="i-mingcute-check-circle-fill text-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-text text-sm font-semibold">{t('onboarding.routeReady.title')}</h2>
          <p className="text-text-secondary mt-1 text-xs leading-relaxed">
            {t('onboarding.routeReady.description', { count: photoCount })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onStartReplay}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-500"
        >
          <i className="i-mingcute-play-fill" />
          {t('onboarding.routeReady.startReplay')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-text-secondary hover:bg-fill-secondary min-h-10 rounded-xl px-4 text-sm transition-colors"
        >
          {t('onboarding.routeReady.later')}
        </button>
      </div>
    </m.section>
  )
}
