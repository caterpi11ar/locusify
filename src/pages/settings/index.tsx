import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LegalDrawer } from '@/components/auth/LegalDrawer'
import { PricingDrawer } from '@/components/pricing'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { cn, glassPanel } from '@/lib/utils'
import { FeedbackDialog } from '@/pages/map/components/FeedbackDialog'
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
}

export const SettingsDrawer: FC<SettingsDrawerProps> = ({ open, onOpenChange, onLogout }) => {
  const { t } = useTranslation()
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
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[80vh] border-none bg-transparent backdrop-blur-none">
          <DrawerHeader className="hidden">
            <DrawerTitle>{t('settings.title')}</DrawerTitle>
            <DrawerDescription>{t('settings.section.appearance')}</DrawerDescription>
          </DrawerHeader>
          <div className={cn(glassPanel, 'flex flex-col overflow-hidden rounded-t-2xl')}>
            <div className="flex-1 overflow-y-auto p-4 pb-safe">
              <h2 className="mb-4 text-lg font-semibold text-text">{t('settings.title')}</h2>
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
                        setTimeout(() => setPricingOpen(true), 300)
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
                    setTimeout(() => setFeedbackOpen(true), 300)
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
        </DrawerContent>
      </Drawer>
      <PricingDrawer open={pricingOpen} onOpenChange={setPricingOpen} />
      <FeedbackDialog open={feedbackOpen} onClose={handleCloseFeedback} />
      {legalType && (
        <LegalDrawer
          type={legalType}
          open
          onOpenChange={open => !open && setLegalType(null)}
        />
      )}
    </>
  )
}
