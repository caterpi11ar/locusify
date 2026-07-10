import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { useCooldown } from '@/hooks/useCooldown'
import { forgotPassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { logout, useAuthStore } from '@/stores/authStore'

interface AccountSectionProps {
  onLogout: () => void
}

export const AccountSection: FC<AccountSectionProps> = ({ onLogout }) => {
  const { t, i18n } = useTranslation()
  const user = useAuthStore(s => s.user)
  const [resettingPassword, setResettingPassword] = useState(false)
  const { cooldown, startCooldown } = useCooldown()

  const handleResetPassword = useCallback(async () => {
    if (!user?.email || cooldown > 0)
      return
    setResettingPassword(true)
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      await forgotPassword(user.email, redirectUrl)
      toast.success(t('auth.forgotPassword.success', { email: user.email }))
      startCooldown()
    }
    catch (err) {
      const lang = i18n.language.startsWith('zh') ? 'zh' : 'en'
      const message = err instanceof ApiError
        ? err.getLocalizedMessage(lang)
        : t('auth.error')
      toast.error(message)
    }
    finally {
      setResettingPassword(false)
    }
  }, [user?.email, cooldown, startCooldown, t, i18n.language])

  const handleLogout = useCallback(async () => {
    await logout()
    onLogout()
  }, [onLogout])

  if (!user)
    return null

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="size-16 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="text-center">
        <p className="text-text text-sm">
          {t('auth.loggedInAs', { name: user.name })}
        </p>
        {user.email && (
          <p className="text-text-secondary mt-0.5 text-xs">{user.email}</p>
        )}
      </div>
      <div className="flex w-full gap-3">
        {user.email && (
          <button
            type="button"
            disabled={resettingPassword || cooldown > 0}
            onClick={handleResetPassword}
            className="bg-fill-secondary hover:bg-fill-tertiary text-text flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {resettingPassword && <Spinner className="size-4" />}
            {cooldown > 0
              ? t('auth.email.resendIn', { seconds: cooldown })
              : t('auth.account.resetPassword')}
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="bg-fill-secondary hover:bg-fill-tertiary text-text flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
        >
          {t('auth.logout')}
        </button>
      </div>
    </div>
  )
}
