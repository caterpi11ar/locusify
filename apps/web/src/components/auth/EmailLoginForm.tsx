import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCooldown } from '@/hooks/useCooldown'
import { sendOtp, verifyOtp } from '@/lib/api/auth'
import { cn } from '@/lib/utils'
import { handleOAuthCallback } from '@/stores/authStore'

interface EmailLoginFormProps {
  onSuccess: () => void
  disabled?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

export const EmailLoginForm: FC<EmailLoginFormProps> = ({ onSuccess, disabled }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const { cooldown, startCooldown } = useCooldown()

  const handleSendCode = useCallback(async () => {
    if (disabled) {
      toast.error(t('auth.privacy.required'))
      return
    }
    setEmailError('')
    if (!EMAIL_RE.test(email)) {
      setEmailError(t('auth.email.invalidEmail'))
      return
    }

    setLoading(true)
    try {
      await sendOtp(email)
      setStep('code')
      startCooldown()
    }
    catch {
      toast.error(t('auth.email.sendError'))
    }
    finally {
      setLoading(false)
    }
  }, [disabled, email, startCooldown, t])

  const handleVerify = useCallback(async () => {
    if (disabled) {
      toast.error(t('auth.privacy.required'))
      return
    }
    if (code.length !== 6)
      return

    setLoading(true)
    try {
      const res = await verifyOtp(email, code)
      await handleOAuthCallback(res.access_token, res.refresh_token)
      onSuccess()
    }
    catch {
      toast.error(t('auth.email.invalidCode'))
    }
    finally {
      setLoading(false)
    }
  }, [disabled, code, email, onSuccess, t])

  const handleResend = useCallback(async () => {
    if (cooldown > 0)
      return

    setLoading(true)
    try {
      await sendOtp(email)
      startCooldown()
    }
    catch {
      toast.error(t('auth.email.sendError'))
    }
    finally {
      setLoading(false)
    }
  }, [cooldown, email, startCooldown, t])

  const handleChangeEmail = useCallback(() => {
    setStep('email')
    setCode('')
    setEmailError('')
  }, [])

  if (step === 'code') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-text-secondary text-center text-sm">
          {t('auth.email.codeSent', { email })}
        </p>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder={t('auth.email.codePlaceholder')}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          className="bg-fill-secondary border-fill-secondary text-text h-11 rounded-xl text-center text-lg tracking-widest"
        />
        <button
          type="button"
          disabled={code.length !== 6 || loading}
          onClick={handleVerify}
          className={cn(
            'bg-fill-secondary hover:bg-fill-tertiary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
            'text-text disabled:opacity-50',
          )}
        >
          {loading && <Spinner className="size-4" />}
          {loading ? t('auth.email.verifying') : t('auth.email.verify')}
        </button>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-text-secondary text-xs hover:underline"
          >
            {t('auth.email.changeEmail')}
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={handleResend}
            className="text-text-secondary text-xs disabled:opacity-50 hover:underline"
          >
            {cooldown > 0
              ? t('auth.email.resendIn', { seconds: cooldown })
              : t('auth.email.resend')}
          </button>
        </div>
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
              handleSendCode()
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
        disabled={loading}
        onClick={handleSendCode}
        className={cn(
          'bg-fill-secondary hover:bg-fill-tertiary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
          'text-text disabled:opacity-50',
        )}
      >
        {loading && <Spinner className="size-4" />}
        {loading ? t('auth.email.sending') : t('auth.email.sendCode')}
      </button>
    </div>
  )
}
