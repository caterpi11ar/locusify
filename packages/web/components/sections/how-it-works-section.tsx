'use client'

import { useTranslations } from 'next-intl'

export function HowItWorksSection() {
  const t = useTranslations('HowItWorks')

  const steps = [
    { number: '01', title: t('step1.title'), description: t('step1.description') },
    { number: '02', title: t('step2.title'), description: t('step2.description') },
    { number: '03', title: t('step3.title'), description: t('step3.description') },
    { number: '04', title: t('step4.title'), description: t('step4.description') },
  ]

  return (
    <section className="bg-background px-6 py-20 md:px-12 md:py-28 lg:px-20 lg:py-36">
      <div className="mb-16 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t('heading.subtitle')}
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl">
          {t('heading.title')}
        </h2>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(step => (
          <div
            key={step.number}
            className="bg-background p-8 md:p-10"
          >
            <p className="text-5xl font-light tracking-tight text-muted-foreground/30 md:text-6xl">
              {step.number}
            </p>
            <h3 className="mt-6 text-lg font-medium text-foreground">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
