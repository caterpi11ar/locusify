import type { FC } from 'react'
import { Drawer } from 'antd'
import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LegalDrawer } from '@/components/auth/LegalDrawer'
import { FeedbackDialog } from '@/components/feedback'
import { PricingDrawer } from '@/components/pricing'
import { Separator } from '@/components/ui/separator'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, glassPanel } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { AboutSection } from './components/AboutSection'
import { AccountSection } from './components/AccountSection'
import { AvatarSetting } from './components/AvatarSetting'
import { LanguageSetting } from './components/LanguageSetting'
import { PrivacySection } from './components/PrivacySection'
import { RedeemCodeSection } from './components/RedeemCodeSection'
import { SettingsSection } from './components/SettingsSection'
import { ThemeSetting } from './components/ThemeSetting'

interface SettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout?: () => void
  modal?: boolean
  desktopOffset?: number
}

export const SettingsDrawer: FC<SettingsDrawerProps> = ({ open, onOpenChange, onLogout, modal, desktopOffset = 0 }) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const user = useAuthStore(s => s.user)
  const { subscription, isPro } = useSubscriptionStore()
  const [pricingOpen, setPricingOpen] = useState(false)
  const [legalType, setLegalType] = useState<'privacy-policy' | 'terms-of-service' | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const handleLogout = useCallback(() => {
    onOpenChange(false)
    onLogout?.()
  }, [onOpenChange, onLogout])

  const handleCloseFeedback = useCallback(() => {
    setFeedbackOpen(false)
  }, [])

  return (
    <>
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        placement={isMobile ? 'bottom' : 'left'}
        size={isMobile ? 'auto' : 480}
        mask={{ enabled: modal ?? isMobile, closable: modal ?? isMobile }}
        zIndex={!isMobile && modal === false ? 900 : undefined}
        closable={false}
        destroyOnHidden
        rootStyle={!isMobile ? { left: desktopOffset } : undefined}
        styles={{
          wrapper: isMobile ? { maxHeight: '80dvh' } : { height: '100dvh', width: 480 },
          body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
        }}
      >
        <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-l-none sm:rounded-r-2xl')}>
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 pb-2">
            <h2 className="text-text text-lg font-semibold">{t('settings.title')}</h2>
            <button
              type="button"
              aria-label="Close drawer"
              onClick={() => onOpenChange(false)}
              className="bg-fill-secondary hover:bg-fill-tertiary text-text/60 hover:text-text flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-safe">
            {user && (
              <SettingsSection label={t('settings.section.account')}>
                <AccountSection onLogout={handleLogout} />
              </SettingsSection>
            )}
            <SettingsSection label={t('settings.section.appearance')}>
              <ThemeSetting />
              <Separator />
              <LanguageSetting />
            </SettingsSection>
            <SettingsSection label={t('settings.section.replay')}>
              <AvatarSetting />
            </SettingsSection>
            {user && (
              <SettingsSection label={t('settings.section.subscription')}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-text">
                      {t('settings.subscription.currentPlan')}
                    </p>
                    <p className="text-xs text-text/50">
                      {t(`settings.subscription.${subscription.plan}`)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      setTimeout(setPricingOpen, 300, true)
                    }}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      isPro
                        ? 'bg-text/10 text-text hover:bg-text/15'
                        : 'bg-sky-400 text-white hover:bg-sky-500',
                    )}
                  >
                    {isPro ? t('settings.subscription.manage') : t('settings.subscription.upgrade')}
                  </button>
                </div>
                <Separator />
                <RedeemCodeSection />
              </SettingsSection>
            )}
            <SettingsSection label={t('settings.section.privacy')}>
              <PrivacySection />
            </SettingsSection>
            <SettingsSection label={t('settings.section.about')}>
              <AboutSection />
              <Separator />
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  setTimeout(setFeedbackOpen, 300, true)
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-fill-secondary"
              >
                <div className="flex items-center gap-2">
                  <span className="i-mingcute-message-3-line size-4 text-text/50" />
                  <span className="text-sm font-medium text-text">{t('settings.feedback')}</span>
                </div>
              </button>
            </SettingsSection>
            <div className="flex justify-center py-3">
              <a href="https://www.buymeacoffee.com/daiqin1046z" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=daiqin1046z&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff"
                  alt="Buy me a coffee"
                  className="h-10"
                />
              </a>
            </div>
            <div className="flex items-center justify-center gap-3 py-3 text-xs text-text/40">
              <button type="button" onClick={() => setLegalType('privacy-policy')} className="hover:text-text/60 transition-colors">
                {t('auth.privacy.privacyPolicy')}
              </button>
              <span>·</span>
              <button type="button" onClick={() => setLegalType('terms-of-service')} className="hover:text-text/60 transition-colors">
                {t('auth.privacy.termsOfService')}
              </button>
            </div>
          </div>
        </div>
      </Drawer>
      <PricingDrawer open={pricingOpen} onOpenChange={setPricingOpen} modal={modal} desktopOffset={desktopOffset} />
      <FeedbackDialog open={feedbackOpen} onClose={handleCloseFeedback} />
      {legalType && (
        <LegalDrawer
          type={legalType}
          open
          onOpenChange={open => !open && setLegalType(null)}
          modal={modal}
          desktopOffset={desktopOffset}
        />
      )}
    </>
  )
}
