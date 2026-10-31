'use client'

import { ArrowUpRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { localizedAppUrl } from '@/lib/app-url'
import { ProductScreenshot } from './product-screenshot'

export function HeroSection() {
  const t = useTranslations('Showcase')
  const locale = useLocale()
  return (
    <section className="bg-[#f7f7f4] px-6 pb-16 pt-36 md:px-12 lg:px-20 lg:pt-44">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Locusify</p>
        <h1 className="mt-4 max-w-4xl text-balance text-4xl font-medium leading-tight tracking-tight md:text-5xl lg:text-6xl">{t('title')}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('description')}</p>
        <a href={localizedAppUrl(locale)} className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-medium text-background">
          {t('cta')}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <figure className="mt-12">
          <ProductScreenshot scene="replay" alt={t('replayAlt')} priority />
          <figcaption className="mt-4 text-sm text-muted-foreground">{t('caption')}</figcaption>
        </figure>
      </div>
    </section>
  )
}
