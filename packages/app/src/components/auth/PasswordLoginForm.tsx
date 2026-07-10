import type { FC } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCooldown } from '@/hooks/useCooldown'
import { forgotPassword, signin, signup } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { handleOAuthCallback } from '@/stores/authStore'

interface PasswordLoginFormProps {
  onSuccess: () => void
  disabled?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const PasswordLoginForm: FC<PasswordLoginFormProps> = ({ onSuccess, disabled }) => {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [view, setView] = useState<'form' | 'forgot'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { cooldown, startCooldown } = useCooldown()

  const isLogin = mode === 'login'

  const handleSubmit = useCallback(async () => {
    if (disabled) {
      toast.error(t('auth.privacy.required'))
      return
    }
    setEmailError('')
    setPasswordError('')

    if (!EMAIL_RE.test(email)) {
      setEmailError(t('auth.email.invalidEmail'))
      return
    }

    if (!PASSWORD_RE.test(password)) {
      setPasswordError(t('auth.signup.password.hint'))
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setPasswordError(t('auth.resetPassword.mismatch'))
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        const res = await signin(email, password)
        await handleOAuthCallback(res.access_token, res.refresh_token)
        onSuccess()
      }
      else {
        const res = await signup(email, password)
        if (res.access_token && res.refresh_token) {
          await handleOAuthCallback(res.access_token, res.refresh_token)
          onSuccess()
        }
        else {
          toast.success(t('auth.signup.success.message', { email }))
        }
      }
    }
    catch (err) {
      const lang = i18n.language.startsWith('zh') ? 'zh' : 'en'
      const message = err instanceof ApiError
        ? err.getLocalizedMessage(lang)
        : t('auth.error')
      toast.error(message)
    }
    finally {
      setLoading(false)
    }
  }, [disabled, email, password, confirmPassword, isLogin, onSuccess, t, i18n.language])

  const handleForgotPassword = useCallback(async () => {
    if (disabled) {
      toast.error(t('auth.privacy.required'))
      return
    }
    if (cooldown > 0)
      return
    setEmailError('')

    if (!EMAIL_RE.test(email)) {
      setEmailError(t('auth.email.invalidEmail'))
      return
    }

    setLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      await forgotPassword(email, redirectUrl)
      toast.success(t('auth.forgotPassword.success', { email }))
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
      setLoading(false)
    }
  }, [disabled, cooldown, email, startCooldown, t, i18n.language])

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'login' ? 'signup' : 'login')
    setView('form')
    setPassword('')
    setConfirmPassword('')
    setEmailError('')
    setPasswordError('')
    setShowPassword(false)
  }, [])

  const submitLabel = isLogin
    ? (loading ? t('auth.login.button.submitting') : t('auth.login.button.submit'))
    : (loading ? t('auth.signup.button.submitting') : t('auth.signup.button.submit'))

  if (view === 'forgot') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-text-secondary text-center text-sm">
          {t('auth.forgotPassword.description')}
        </p>

        <div>
          <Input
            type="email"
            autoComplete="email"
            placeholder={t('auth.email.placeholder')}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError)
                setEmailError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                handleForgotPassword()
            }}
            aria-invalid={!!emailError}
            disabled={loading}
            className="bg-fill-secondary border-fill-secondary text-text h-11 rounded-xl"
          />
          {emailError && (
            <p className="text-red mt-1 text-xs">{emailError}</p>
          )}
        </div>

        <button
          type="button"
          disabled={loading || cooldown > 0}
          onClick={handleForgotPassword}
          className={cn(
            'bg-fill-secondary hover:bg-fill-tertiary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
            'text-text disabled:opacity-50',
          )}
        >
          {loading && <Spinner className="size-4" />}
          {cooldown > 0
            ? t('auth.email.resendIn', { seconds: cooldown })
            : loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
        </button>

        <button
          type="button"
          onClick={() => {
            setView('form')
            setEmailError('')
          }}
          className="text-primary text-center text-xs font-medium hover:underline"
        >
          {t('auth.forgotPassword.backToLogin')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Input
          type="email"
          autoComplete="email"
          placeholder={t('auth.email.placeholder')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError)
              setEmailError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              handleSubmit()
          }}
          aria-invalid={!!emailError}
          disabled={loading}
          className="bg-fill-secondary border-fill-secondary text-text h-11 rounded-xl"
        />
        {emailError && (
          <p className="text-red mt-1 text-xs">{emailError}</p>
        )}
      </div>

      <div>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder={t('auth.login.password.placeholder')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError)
                setPasswordError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                handleSubmit()
            }}
            aria-invalid={!!passwordError}
            disabled={loading}
            className="bg-fill-secondary border-fill-secondary text-text h-11 rounded-xl pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(prev => !prev)}
            className="text-text-secondary absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={showPassword ? t('auth.login.password.hide') : t('auth.login.password.show')}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {!isLogin && !passwordError && (
          <p className="text-text-secondary mt-1 text-xs">{t('auth.signup.password.hint')}</p>
        )}
        {passwordError && (
          <p className="text-red mt-1 text-xs">{passwordError}</p>
        )}
      </div>

      {!isLogin && (
        <Input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={t('auth.signup.confirmPassword.placeholder')}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (passwordError)
              setPasswordError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              handleSubmit()
          }}
          disabled={loading}
          className="bg-fill-secondary border-fill-secondary text-text h-11 rounded-xl"
        />
      )}

      {isLogin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setView('forgot')
              setPasswordError('')
            }}
            className="text-primary text-xs font-medium hover:underline"
          >
            {t('auth.login.forgotPassword')}
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        className={cn(
          'bg-fill-secondary hover:bg-fill-tertiary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
          'text-text disabled:opacity-50',
        )}
      >
        {loading && <Spinner className="size-4" />}
        {submitLabel}
      </button>

      <p className="text-text-secondary text-center text-xs">
        {isLogin ? t('auth.login.switch.text') : t('auth.signup.switch.text')}
        {' '}
        <button
          type="button"
          onClick={toggleMode}
          className="text-primary font-medium hover:underline"
        >
          {isLogin ? t('auth.login.switch.link') : t('auth.signup.switch.link')}
        </button>
      </p>
    </div>
  )
}
