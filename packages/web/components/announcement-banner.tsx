'use client'

import { Check, Copy, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

export function AnnouncementBanner({ onClose }: { onClose: () => void }) {
  const t = useTranslations('Hero.promotion')
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const active = useRef(true)
  const pending = useRef(false)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  useEffect(() => {
    if (status !== 'success')
      return
    const timeout = window.setTimeout(setStatus, 2000, 'idle')
    return () => window.clearTimeout(timeout)
  }, [status])

  const copyCode = async () => {
    if (pending.current)
      return
    pending.current = true
    setStatus('pending')
    try {
      await navigator.clipboard.writeText(t('code'))
      if (active.current)
        setStatus('success')
    }
    catch {
      if (active.current)
        setStatus('error')
    }
    finally {
      pending.current = false
    }
  }

  return (
    <aside aria-label={t('title')} data-announcement-banner className="bg-[#24241f] py-3 pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] text-sm leading-5 text-white sm:pl-[max(24px,env(safe-area-inset-left))] sm:pr-[max(24px,env(safe-area-inset-right))]">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_44px] items-start gap-3">
        <div className="min-w-0 space-y-2">
          <p>{t('title')}</p>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
            <code className="min-w-0 select-text whitespace-normal font-mono font-semibold text-amber-300 [overflow-wrap:anywhere]">{t('code')}</code>
            <button type="button" onClick={copyCode} aria-disabled={status === 'pending'} className="inline-flex min-h-11 min-w-22 items-center justify-center gap-2 justify-self-start rounded-full border border-white/30 bg-white/10 px-4 py-2 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {status === 'success' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {status === 'pending' ? t('copying') : status === 'success' ? t('copied') : t('copy')}
            </button>
          </div>
          <p role="status" aria-live="polite" className="empty:hidden">{status === 'success' ? t('success') : status === 'error' ? t('error') : ''}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            active.current = false
            onClose()
          }}
          aria-label={t('close')}
          className="inline-flex size-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
