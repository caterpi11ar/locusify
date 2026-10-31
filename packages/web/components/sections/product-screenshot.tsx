'use client'

import { useLocale, useTranslations } from 'next-intl'

export function ProductScreenshot({ scene, alt, priority = false, mobileOnly = false }: {
  scene: 'import' | 'map' | 'replay' | 'export'
  alt: string
  priority?: boolean
  mobileOnly?: boolean
}) {
  const locale = useLocale() === 'zh' ? 'zh' : 'en'
  const t = useTranslations('Showcase')
  const landscape = scene === 'replay'
  const wideExport = scene === 'export'
  const mobileSrc = `/images/product/${locale}-mobile${landscape ? '-landscape' : ''}-${scene}.png`
  return (
    <div>
      <a
        href={mobileSrc}
        target="_blank"
        rel="noreferrer"
        className="block"
        aria-label={alt}
        onClick={(event) => {
          const image = event.currentTarget.querySelector('img')
          if (image?.currentSrc)
            event.currentTarget.href = image.currentSrc
        }}
      >
        <picture>
          {!mobileOnly && <source media="(min-width: 768px)" srcSet={`/images/product/${locale}-desktop-${scene}.png`} width={1440} height={900} />}
          {/* Actual app captures preserve the complete UI and its native aspect ratio. */}
          <img src={mobileSrc} alt={alt} width={landscape || wideExport ? 844 : 390} height={landscape || wideExport ? 700 : 844} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} className="block h-auto w-full rounded-2xl border border-border" />
        </picture>
        <span className="mt-2 block text-xs text-muted-foreground underline underline-offset-4">{t('viewImage')}</span>
      </a>
      <p className="mt-2 text-xs text-muted-foreground">
        ©
        {' '}
        <a href="https://www.openstreetmap.org/copyright" className="underline">OpenStreetMap</a>
        {' '}
        · ©
        {' '}
        <a href="https://carto.com/attributions" className="underline">CARTO</a>
      </p>
    </div>
  )
}
