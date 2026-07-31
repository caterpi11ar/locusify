import type { ComponentType, FC } from 'react'
import type { AuthProvider, AuthProviderType } from '@/lib/auth/types'
import { Drawer } from 'antd'
import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { EmailLoginForm } from '@/components/auth/EmailLoginForm'
import { LegalDrawer } from '@/components/auth/LegalDrawer'
import { PasswordLoginForm } from '@/components/auth/PasswordLoginForm'
import { Checkbox } from '@/components/ui/checkbox'
import { GitHubIcon } from '@/components/ui/github-icon'
import { GoogleIcon } from '@/components/ui/google-icon'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getAuthProviders } from '@/lib/auth'
import { cn, glassPanel } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface LoginDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dismissible?: boolean
  modal?: boolean
  desktopOffset?: number
}

type LoginMethod = 'otp' | 'password'

const providerIcons: Record<Exclude<AuthProviderType, 'email'>, ComponentType> = {
  google: GoogleIcon,
  github: GitHubIcon,
}

export const LoginDrawer: FC<LoginDrawerProps> = ({ open, onOpenChange, dismissible = true, modal, desktopOffset = 0 }) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const isLoggingIn = useAuthStore(s => s.isLoggingIn)
  const setLoggingIn = useAuthStore(s => s.setLoggingIn)
  const [activeProvider, setActiveProvider] = useState<AuthProviderType | null>(null)
  const [privacyConsented, setPrivacyConsented] = useState(false)
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp')
  const [legalType, setLegalType] = useState<'privacy-policy' | 'terms-of-service' | null>(null)
  const { language, setLanguage } = useSettingsStore()

  const handleLogin = useCallback(async (provider: AuthProvider) => {
    if (!privacyConsented) {
      toast.error(t('auth.privacy.required'))
      return
    }
    if (isLoggingIn)
      return

    setLoggingIn(true)
    setActiveProvider(provider.type)
    try {
      await provider.login()
      // Redirect flow — page will navigate away; no need to close drawer
    }
    catch {
      toast.error(t('auth.error'))
      setLoggingIn(false)
      setActiveProvider(null)
    }
  }, [privacyConsented, isLoggingIn, setLoggingIn, t])

  const providers = getAuthProviders()

  return (
    <>
      <Drawer
        open={open}
        onClose={() => dismissible && onOpenChange(false)}
        placement={isMobile ? 'bottom' : 'left'}
        size={isMobile ? 'auto' : 480}
        mask={{ enabled: modal ?? isMobile, closable: dismissible && (modal ?? isMobile) }}
        keyboard={dismissible}
        zIndex={!isMobile && modal === false ? 900 : undefined}
        closable={false}
        destroyOnHidden
        rootStyle={!isMobile ? { left: desktopOffset } : undefined}
        styles={{
          wrapper: isMobile ? { maxHeight: '95dvh' } : { height: '100dvh', width: 480 },
          body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
        }}
      >
        <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-l-none sm:rounded-r-2xl')}>
          <div className="flex h-12 shrink-0 items-center justify-between px-4 pt-3">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'zh-CN' : 'en')}
              className="bg-fill-secondary hover:bg-fill-tertiary text-text flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <i className="i-mingcute-translate-2-line size-4" />
              {language === 'en' ? '中文' : 'EN'}
            </button>
            {dismissible
              ? (
                  <button
                    type="button"
                    aria-label="Close drawer"
                    onClick={() => onOpenChange(false)}
                    className="bg-fill-secondary hover:bg-fill-tertiary text-text/60 hover:text-text flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )
              : <div className="size-8" />}
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-safe">
            <div className="flex flex-col gap-4 py-2">
              <div className="text-center">
                <h2 className="text-text text-lg font-semibold">{t('auth.drawer.login.title')}</h2>
                <p className="text-text-secondary mt-1 text-sm">{t('auth.drawer.login.description')}</p>
              </div>

              <Separator className="bg-fill-secondary" />

              {/* Login method tabs */}
              <div className="bg-fill-secondary flex rounded-xl p-1">
                {(['otp', 'password'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setLoginMethod(method)}
                    className={cn(
                      'flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      loginMethod === method
                        ? 'bg-white/90 dark:bg-white/15 text-text shadow-sm'
                        : 'text-text/50 hover:text-text',
                    )}
                  >
                    {t(`auth.method.${method}`)}
                  </button>
                ))}
              </div>

              {loginMethod === 'otp'
                ? (
                    <EmailLoginForm
                      onSuccess={() => onOpenChange(false)}
                      disabled={!privacyConsented}
                    />
                  )
                : (
                    <PasswordLoginForm
                      onSuccess={() => onOpenChange(false)}
                      disabled={!privacyConsented}
                    />
                  )}

              <div className="flex items-center gap-3">
                <Separator className="bg-fill-secondary flex-1" />
                <span className="text-text-secondary text-xs">{t('auth.email.separator')}</span>
                <Separator className="bg-fill-secondary flex-1" />
              </div>

              <div className="flex gap-3">
                {providers.map((provider) => {
                  const isActive = activeProvider === provider.type
                  const ProviderIcon = provider.type === 'email' ? null : providerIcons[provider.type]
                  return (
                    <button
                      key={provider.type}
                      type="button"
                      disabled={isLoggingIn}
                      onClick={() => handleLogin(provider)}
                      className={cn(
                        'bg-fill-secondary hover:bg-fill-tertiary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        'text-text disabled:opacity-50',
                        isActive && 'cursor-wait',
                        isLoggingIn && !isActive && 'cursor-not-allowed',
                      )}
                    >
                      {isActive
                        ? <Spinner className="size-5" />
                        : ProviderIcon
                          ? <ProviderIcon />
                          : null}
                      <span className="hidden sm:inline">
                        {provider.type === 'google'
                          ? t('auth.login.oauth.google')
                          : t('auth.login.oauth.github')}
                      </span>
                    </button>
                  )
                })}
              </div>

              <label className="flex cursor-pointer select-none items-start gap-2">
                <Checkbox
                  checked={privacyConsented}
                  onCheckedChange={checked => setPrivacyConsented(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-text-secondary text-xs leading-relaxed">
                  {t('auth.privacy.agree')}
                  {' '}
                  <button type="button" onClick={() => setLegalType('privacy-policy')} className="text-primary hover:underline">{t('auth.privacy.privacyPolicy')}</button>
                  {' '}
                  {t('auth.privacy.and')}
                  {' '}
                  <button type="button" onClick={() => setLegalType('terms-of-service')} className="text-primary hover:underline">{t('auth.privacy.termsOfService')}</button>
                </span>
              </label>
            </div>
          </div>
        </div>
      </Drawer>
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
