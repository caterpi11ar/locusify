'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ProductScreenshot } from './product-screenshot'

export function ResultsSection() {
  const t = useTranslations('Showcase')
  return (
    <section id="gallery" className="scroll-mt-28 bg-muted/30 px-6 py-16 md:px-12 lg:px-20">
      <span id="scenarios" className="scroll-mt-28" />
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{t('resultsTitle')}</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{t('resultsDescription')}</p>
        <div className="my-8 grid grid-cols-3 gap-3 md:gap-6">
          {['lake', 'ridge', 'sunset'].map((name, index) => (
            <figure key={name}>
              <Image src={`/images/product/sample-${name}.jpg`} alt={t('sampleAlt', { number: index + 1 })} width={1200} height={800} className="h-auto w-full rounded-xl" />
              <figcaption className="mt-2 text-xs text-muted-foreground">{t('sampleLabel', { number: index + 1 })}</figcaption>
            </figure>
          ))}
        </div>
        <figure>
          <ProductScreenshot scene="replay" alt={t('replayAlt')} />
          <figcaption className="mt-4 text-sm text-muted-foreground">{t('replayCaption')}</figcaption>
        </figure>
      </div>
    </section>
  )
}
