'use client'

import { useTranslations } from 'next-intl'
import { FadeImage } from '@/components/fade-image'

export function CollectionSection() {
  const t = useTranslations('Collection')

  const scenarios = [
    { id: 1, name: t('scenario1.name'), description: t('scenario1.description'), image: '/images/travel-collection-1.jpg' },
    { id: 2, name: t('scenario2.name'), description: t('scenario2.description'), image: '/images/travel-collection-2.jpg' },
    { id: 3, name: t('scenario3.name'), description: t('scenario3.description'), image: '/images/travel-collection-3.jpg' },
    { id: 4, name: t('scenario4.name'), description: t('scenario4.description'), image: '/images/travel-collection-4.jpg' },
    { id: 5, name: t('scenario5.name'), description: t('scenario5.description'), image: '/images/travel-collection-5.jpg' },
    { id: 6, name: t('scenario6.name'), description: t('scenario6.description'), image: '/images/travel-collection-6.jpg' },
  ]

  return (
    <section id="scenarios" className="bg-background">
      <div className="px-6 py-20 md:px-12 lg:px-20 md:py-10">
        <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
          {t('heading.title')}
        </h2>
      </div>

      <div className="pb-24">
        <div className="flex gap-6 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:px-12 lg:px-20">
          {scenarios.map(scenario => (
            <div key={scenario.id} className="group w-[75vw] flex-shrink-0 snap-center md:w-auto">
              <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-secondary">
                <FadeImage
                  src={scenario.image || '/placeholder.svg'}
                  alt={scenario.name}
                  fill
                  sizes="(max-width: 767px) 75vw, 33vw"
                  className="object-cover group-hover:scale-105"
                />
              </div>
              <div className="py-6">
                <h3 className="text-lg font-medium leading-snug text-foreground">
                  {scenario.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {scenario.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
