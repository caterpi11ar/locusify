'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function PrivacySummarySection() {
  const t = useTranslations('Showcase')
  return (
    <section id="technology" className="scroll-mt-28 px-6 py-16 md:px-12 lg:px-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-medium tracking-tight">{t('privacyTitle')}</h2>
        <p className="mt-5 leading-relaxed text-muted-foreground">{t('privacyDescription')}</p>
        <Link href="/privacy" className="mt-5 inline-block text-sm underline underline-offset-4">{t('privacyLink')}</Link>
      </div>
    </section>
  )
}
