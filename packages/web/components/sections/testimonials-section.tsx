'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'

export function TestimonialsSection() {
  const t = useTranslations('Testimonials')

  return (
    <section id="about" className="bg-background">
      <div className="px-6 py-24 md:px-12 md:py-32 lg:px-20 lg:py-40">
        <p className="mx-auto max-w-5xl text-2xl leading-relaxed text-foreground md:text-3xl lg:text-[2.5rem] lg:leading-snug">
          {t('content.statement')}
        </p>
      </div>

      <div className="relative aspect-[16/9] w-full">
        <Image
          src="/images/travel-testimonial.jpg"
          alt={t('content.imageAlt')}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>
    </section>
  )
}
