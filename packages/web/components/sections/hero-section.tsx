'use client'

import { useTranslations } from 'next-intl'
import PixelBlast from '@/components/pixel-blast'

export function HeroSection() {
  const t = useTranslations('Hero')
  const title = t('tagline.line1').replace(/^将\s*/, '').replace(/[，,]\s*$/, '')

  return (
    <section
      aria-label="Locusify hero"
      className="relative min-h-[calc(100svh-40px)] overflow-hidden bg-slate-950 text-white"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#B497CF"
          patternScale={2}
          patternDensity={1}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.5}
          edgeFade={0.25}
          transparent
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_18%,rgba(180,151,207,0.24),rgba(15,23,42,0)_36%),linear-gradient(180deg,rgba(2,6,23,0.12)_0%,rgba(2,6,23,0.32)_54%,rgba(2,6,23,0.9)_100%)]" />

      <div className="relative z-10 grid min-h-[calc(100svh-40px)] content-end gap-10 px-6 pb-14 pt-32 md:px-12 md:pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-12 lg:px-20 lg:pb-18">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/68">LOCUSIFY</p>
          <h1 className="mt-6 max-w-full text-[clamp(3rem,4.2vw,5.5rem)] font-medium leading-none tracking-normal text-white md:whitespace-nowrap">
            {title}
          </h1>
        </div>

        <div className="max-w-md lg:justify-self-end lg:pb-2">
          <p className="text-base font-medium leading-7 text-white/82 md:text-lg">
            {t('description')}
          </p>
          <a
            href="https://app.locusify.cn"
            className="mt-7 inline-flex h-14 items-center rounded-full bg-white px-9 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-80"
          >
            {t('action.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}
