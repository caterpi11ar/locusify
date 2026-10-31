'use client'

import { useTranslations } from 'next-intl'
import { ProductScreenshot } from './product-screenshot'

export function HowItWorksSection() {
  const t = useTranslations('Showcase')
  const steps = ['import', 'map', 'export'] as const
  return (
    <section id="features" className="scroll-mt-28 px-6 py-16 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{t('stepsTitle')}</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {steps.map((scene, index) => (
            <article key={scene}>
              <p className="text-sm text-muted-foreground">
                0
                {index + 1}
              </p>
              <h3 className="mt-3 text-xl font-medium">{t(`${scene}Title`)}</h3>
              <p className="mb-6 mt-3 text-sm leading-relaxed text-muted-foreground">{t(`${scene}Description`)}</p>
              <ProductScreenshot scene={scene} alt={t(`${scene}Alt`)} mobileOnly />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
