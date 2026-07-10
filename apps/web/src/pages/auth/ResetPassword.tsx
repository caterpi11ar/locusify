import { Eye, EyeOff } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { resetPassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function parseHashParams() {
  const hash = window.location.hash.slice(1)
  return new URLSearchParams(hash)
}

export default function ResetPassword() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { tokenHash, hashError } = useMemo(() => {
    const params = parseHashParams()

    // Check for error in hash fragment (e.g. expired link)
    const error = params.get('error')
    if (error) {
      const description = params.get('error_description')
      return { tokenHash: null, hashError: description || error }
    }

    // Supabase sends access_token in hash fragment for recovery flow
    if (params.get('type') === 'recovery') {
      return { tokenHash: params.get('access_token'), hashError: null }
    }

    // Fallback: check query params for token_hash
    return { tokenHash: searchParams.get('token_hash'), hashError: null }
  }, [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async () => {
    setError('')

    if (!PASSWORD_RE.test(newPassword)) {
      setError(t('auth.signup.password.hint'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPassword.mismatch'))
      return
    }

    setLoading(true)
    try {
      await resetPassword(tokenHash!, newPassword)
      toast.success(t('auth.resetPassword.success'))
      navigate('/', { replace: true })
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
  }, [tokenHash, newPassword, confirmPassword, navigate, t, i18n.language])

  if (hashError || !tokenHash) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black p-4 text-center">
        <p className="text-sm text-red-400">
          {t('auth.resetPassword.invalidCode')}
        </p>
        {hashError && (
          <p className="text-text-secondary max-w-xs text-xs">{hashError}</p>
        )}
        <a href="/" className="text-sm text-sky-400 hover:text-sky-300">
          {t('error.404.back')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="text-center">
          <h1 className="text-text text-lg font-semibold">{t('auth.resetPassword.title')}</h1>
          <p className="text-text-secondary mt-1 text-sm">{t('auth.resetPassword.description')}</p>
        </div>

        <div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('auth.resetPassword.newPassword')}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (error)
                  setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  handleSubmit()
              }}
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
          <p className="text-text-secondary mt-1 text-xs">{t('auth.signup.password.hint')}</p>
        </div>

        <Input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={t('auth.resetPassword.confirmPassword')}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (error)
              setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              handleSubmit()
          }}
          disabled={loading}
          className="bg-fill-secondary border-fill-secondary text-text h-11 rounded-xl"
        />

        {error && (
          <p className="text-red text-center text-xs">{error}</p>
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
          {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
        </button>
      </div>
    </div>
  )
}
