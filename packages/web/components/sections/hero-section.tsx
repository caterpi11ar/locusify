'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const word = 'LOCUSIFY'

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const t = useTranslations('Hero')

  const sideImages = [
    { src: '/images/travel-hero-1.jpg', alt: t('alt.side1'), position: 'left', span: 1 },
    { src: '/images/travel-hero-2.jpg', alt: t('alt.side2'), position: 'left', span: 1 },
    { src: '/images/travel-hero-3.jpg', alt: t('alt.side3'), position: 'right', span: 1 },
    { src: '/images/travel-hero-4.jpg', alt: t('alt.side4'), position: 'right', span: 1 },
  ]

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current)
        return

      const rect = sectionRef.current.getBoundingClientRect()
      const scrollableHeight = window.innerHeight * 2
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / scrollableHeight))

      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const textOpacity = Math.max(0, 1 - (scrollProgress / 0.2))
  const imageProgress = Math.max(0, Math.min(1, (scrollProgress - 0.2) / 0.8))
  const centerWidth = 100 - (imageProgress * 58)
  const centerHeight = 100 - (imageProgress * 30)
  const sideWidth = imageProgress * 22
  const sideOpacity = imageProgress
  const sideTranslateLeft = -100 + (imageProgress * 100)
  const sideTranslateRight = 100 - (imageProgress * 100)
  const borderRadius = imageProgress * 24
  const gap = imageProgress * 16
  const sideTranslateY = -(imageProgress * 15)

  return (
    <section ref={sectionRef} className="relative bg-background">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="relative flex h-full w-full items-stretch justify-center"
            style={{ gap: `${gap}px`, padding: `${imageProgress * 16}px`, paddingBottom: `${60 + (imageProgress * 40)}px` }}
          >
            <div
              className="flex flex-col will-change-transform"
              style={{
                width: `${sideWidth}%`,
                gap: `${gap}px`,
                transform: `translateX(${sideTranslateLeft}%) translateY(${sideTranslateY}%)`,
                opacity: sideOpacity,
              }}
            >
              {sideImages.filter(img => img.position === 'left').map((img, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden will-change-transform"
                  style={{ flex: img.span, borderRadius: `${borderRadius}px` }}
                >
                  <Image src={img.src || '/placeholder.svg'} alt={img.alt} fill className="object-cover" sizes="22vw" />
                </div>
              ))}
            </div>

            <div
              className="relative overflow-hidden will-change-transform"
              style={{
                width: `${centerWidth}%`,
                height: `${centerHeight}%`,
                flex: '0 0 auto',
                borderRadius: `${borderRadius}px`,
              }}
            >
              <Image
                src="/images/travel-hero-main.jpg"
                alt={t('alt.main')}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              <div
                className="absolute inset-0 flex items-end overflow-hidden"
                style={{ opacity: textOpacity }}
              >
                <div aria-hidden="true" className="w-full text-[13vw] font-medium leading-[0.8] tracking-tighter text-white">
                  {word.split('').map((letter, index) => (
                    <span
                      key={index}
                      className="inline-block animate-[slideUp_0.8s_ease-out_forwards] opacity-0"
                      style={{
                        animationDelay: `${index * 0.08}s`,
                        transition: 'all 1.5s',
                        transitionTimingFunction: 'cubic-bezier(0.86, 0, 0.07, 1)',
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="flex flex-col will-change-transform"
              style={{
                width: `${sideWidth}%`,
                gap: `${gap}px`,
                transform: `translateX(${sideTranslateRight}%) translateY(${sideTranslateY}%)`,
                opacity: sideOpacity,
              }}
            >
              {sideImages.filter(img => img.position === 'right').map((img, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden will-change-transform"
                  style={{ flex: img.span, borderRadius: `${borderRadius}px` }}
                >
                  <Image src={img.src || '/placeholder.svg'} alt={img.alt} fill className="object-cover" sizes="22vw" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-[200vh]" />

      <div className="px-6 pt-32 pb-28 md:pt-48 md:px-12 md:pb-36 lg:px-20 lg:pt-56 lg:pb-44">
        <h1 className="mx-auto max-w-2xl text-center text-2xl leading-relaxed text-muted-foreground md:text-3xl lg:text-[2.5rem] lg:leading-snug">
          {t('tagline.line1')}
          <br />
          {t('tagline.line2')}
        </h1>
        <div className="mt-10 flex justify-center">
          <a
            href="https://app.locusify.cn"
            className="inline-block rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            {t('action.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}
