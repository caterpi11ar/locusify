'use client'

import { ArrowDown, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { APP_URL } from '@/lib/app-url'

export function HeroSection() {
  const t = useTranslations('Hero')
  const guestAppUrl = `${APP_URL}/?mode=guest`
  const previewRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    const preview = previewRef.current
    if (!preview || shouldLoad)
      return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const loadPreview = () => {
            if (!document.querySelector(`link[data-app-origin="${APP_URL}"]`)) {
              const preconnect = document.createElement('link')
              preconnect.rel = 'preconnect'
              preconnect.href = APP_URL
              preconnect.crossOrigin = 'anonymous'
              preconnect.dataset.appOrigin = APP_URL
              document.head.appendChild(preconnect)
            }
            setShouldLoad(true)
          }
          const scheduleIdle = () => {
            const requestIdle = (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number }).requestIdleCallback
            if (requestIdle) {
              requestIdle(loadPreview, { timeout: 2500 })
            }
            else {
              window.setTimeout(loadPreview, 250)
            }
          }
          if (document.readyState === 'complete')
            scheduleIdle()
          else
            window.addEventListener('load', scheduleIdle, { once: true })
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )

    observer.observe(preview)
    return () => observer.disconnect()
  }, [shouldLoad])

  useEffect(() => {
    if (!shouldLoad || isLoaded)
      return

    const timeout = window.setTimeout(setHasTimedOut, 15000, true)
    return () => window.clearTimeout(timeout)
  }, [shouldLoad, isLoaded])

  const focusApp = () => {
    setShouldLoad(true)
    previewRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <section
      aria-label="Locusify hero"
      className="relative overflow-hidden bg-[#f7f7f4] pb-14 pt-36 text-[#24241f] sm:pt-44 lg:pb-24 lg:pt-[14.5rem]"
    >
      <div className="relative mx-auto w-11/12 md:w-10/12 2xl:w-9/12">
        <h1 className="w-full text-pretty text-3xl font-normal leading-tight tracking-tight lg:w-3/4 sm:text-4xl">
          {t('tagline.line1')}
          {' '}
          {t('tagline.line2')}
        </h1>

        <div className="mt-8">
          <button
            type="button"
            onClick={focusApp}
            className="inline-flex h-[3.75rem] cursor-pointer items-center gap-2 rounded-full bg-[#24241f] px-8 text-base font-medium text-white transition-colors hover:bg-black"
          >
            {t('action.cta')}
            <ArrowDown className="size-[1.125rem]" aria-hidden="true" />
          </button>
        </div>

        <div
          ref={previewRef}
          id="app-preview"
          className="mt-14 w-full scroll-mt-20 sm:mt-[4.75rem]"
        >
          <div className="overflow-hidden rounded-[14px] bg-neutral-950 shadow-[0_0_0_0.5px_rgba(0,0,0,0.22),0_1px_2px_rgba(0,0,0,0.12),0_24px_64px_-24px_rgba(15,23,42,0.38)]">
            <div className="relative flex h-11 items-center border-b border-black/[0.12] bg-[linear-gradient(180deg,#f6f5f3_0%,#ebeae7_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-12 sm:px-5">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="size-3 rounded-full border border-black/5 bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]" />
                <span className="size-3 rounded-full border border-black/5 bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]" />
                <span className="size-3 rounded-full border border-black/5 bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]" />
              </div>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-medium tracking-tight text-black/50 sm:text-sm">
                Locusify
              </div>
              <a
                href={APP_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={t('action.open')}
                className="ml-auto text-black/45 transition-colors hover:text-black"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>

            <div className="relative h-[72svh] min-h-[520px] bg-neutral-950 sm:h-[78svh] sm:min-h-[620px] lg:h-[82svh]">
              {!isLoaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950 text-white">
                  <Image src="/logo.png" alt="" width={80} height={80} className="size-16 rounded-2xl sm:size-20" />
                  <span className="mt-4 text-2xl font-semibold tracking-tight">Locusify</span>
                  <span className="mt-2 text-sm text-white/40">{t('preview.loading')}</span>
                  <span className="mt-6 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full w-1/2 animate-pulse rounded-full bg-white/60" />
                  </span>
                </div>
              )}

              {shouldLoad && (
                <iframe
                  src={guestAppUrl}
                  title={t('preview.title')}
                  loading="lazy"
                  allow="clipboard-read; clipboard-write; fullscreen; geolocation; web-share"
                  onLoad={() => setIsLoaded(true)}
                  className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
              )}

              {hasTimedOut && !isLoaded && (
                <div className="absolute inset-x-5 bottom-5 z-20 rounded-xl border border-white/10 bg-slate-900/95 p-4 text-left text-white shadow-xl backdrop-blur sm:left-1/2 sm:right-auto sm:w-[28rem] sm:-translate-x-1/2">
                  <p className="text-sm font-semibold">{t('preview.errorTitle')}</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">{t('preview.errorDescription')}</p>
                  <a href={APP_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white underline underline-offset-4">
                    {t('action.open')}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
