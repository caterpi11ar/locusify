'use client'

import { Check, Copy, LoaderCircle, X } from 'lucide-react'
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
    <aside aria-label={t('title')} data-announcement-banner className="bg-[#24241f] py-2 pl-[max(16px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))] text-white sm:px-[max(24px,env(safe-area-inset-left))]">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_44px] items-center gap-3">
        <div className="grid min-w-0 gap-1 sm:flex sm:items-center sm:justify-center sm:gap-4">
          <p className="text-xs leading-4 text-white/80" data-promotion-caption>{status === 'error' ? t('errorCompact') : t('compactTitle')}</p>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-center rounded-full border border-white/15 bg-white/[0.06] sm:w-72">
            <input
              data-promotion-code
              aria-label={t('codeLabel')}
              readOnly
              value={t('code')}
              onFocus={event => event.currentTarget.select()}
              className="h-10 min-w-0 rounded-full bg-transparent pl-4 pr-1 font-mono text-[13px] font-medium tracking-wide text-amber-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-200"
            />
            <button type="button" onClick={copyCode} aria-disabled={status === 'pending'} aria-label={status === 'pending' ? t('copying') : status === 'success' ? t('copied') : t('copy')} title={status === 'pending' ? t('copying') : status === 'success' ? t('copied') : t('copy')} className="inline-flex size-11 items-center justify-center rounded-full text-amber-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {status === 'success' ? <Check className="size-4 text-emerald-300" aria-hidden="true" /> : status === 'pending' ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <span role="status" aria-live="polite" className="sr-only">{status === 'success' ? t('success') : status === 'error' ? t('error') : ''}</span>
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
