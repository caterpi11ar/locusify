'use client'

import { Check, Copy, Gift, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

export function AnnouncementBanner({ onClose }: { onClose: () => void }) {
  const t = useTranslations('Hero.promotion')
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied)
      return

    const timeout = window.setTimeout(() => setIsCopied(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [isCopied])

  const copyCode = async () => {
    await navigator.clipboard.writeText(t('code'))
    setIsCopied(true)
  }

  return (
    <aside
      aria-label={t('title')}
      className="fixed inset-x-0 top-0 z-[60] flex min-h-9 items-center justify-center bg-[#24241f] px-3 py-1.5 text-center text-xs text-white sm:text-sm"
    >
      <div className="flex items-center justify-center gap-2">
        <Gift className="hidden size-4 shrink-0 text-amber-300 sm:block" aria-hidden="true" />
        <span className="whitespace-nowrap">{t('title')}</span>
        <span className="text-white/35" aria-hidden="true">·</span>
        <code className="whitespace-nowrap font-mono font-semibold tracking-wide text-amber-300">
          {t('code')}
        </code>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          aria-label={isCopied ? t('copied') : t('copy')}
        >
          {isCopied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
          <span className="hidden sm:inline">{isCopied ? t('copied') : t('copy')}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 inline-flex size-7 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white sm:right-3"
        aria-label={t('close')}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  )
}
