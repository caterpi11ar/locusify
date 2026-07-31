'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useCallback, useEffect, useRef } from 'react'

export function GallerySection() {
  const galleryRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const isActiveRef = useRef(false)
  const t = useTranslations('Gallery')

  const images = [
    { src: '/images/travel-gallery-1.jpg', alt: t('alt.image1') },
    { src: '/images/travel-gallery-2.jpg', alt: t('alt.image2') },
    { src: '/images/travel-gallery-3.jpg', alt: t('alt.image3') },
    { src: '/images/travel-gallery-4.jpg', alt: t('alt.image4') },
    { src: '/images/travel-gallery-5.jpg', alt: t('alt.image5') },
    { src: '/images/travel-gallery-6.jpg', alt: t('alt.image6') },
    { src: '/images/travel-gallery-7.jpg', alt: t('alt.image7') },
    { src: '/images/travel-gallery-8.jpg', alt: t('alt.image8') },
  ]

  useEffect(() => {
    const calculateHeight = () => {
      if (!containerRef.current)
        return
      const containerWidth = containerRef.current.scrollWidth
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const totalHeight = viewportHeight + (containerWidth - viewportWidth)
      galleryRef.current?.style.setProperty('--gallery-height', `${Math.max(viewportHeight, totalHeight)}px`)
    }

    const resizeObserver = new ResizeObserver(calculateHeight)
    if (containerRef.current)
      resizeObserver.observe(containerRef.current)
    resizeObserver.observe(document.documentElement)
    calculateHeight()
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const updateTransform = useCallback(() => {
    if (!galleryRef.current || !containerRef.current)
      return

    const rect = galleryRef.current.getBoundingClientRect()
    const containerWidth = containerRef.current.scrollWidth
    const viewportWidth = window.innerWidth

    const totalScrollDistance = containerWidth - viewportWidth
    const scrolled = Math.max(0, -rect.top)
    const progress = Math.min(1, scrolled / totalScrollDistance)
    const newTranslateX = progress * -totalScrollDistance

    containerRef.current.style.setProperty('--gallery-x', `${newTranslateX}px`)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (!isActiveRef.current)
        return
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(updateTransform)
    }

    const observer = new IntersectionObserver(([entry]) => {
      isActiveRef.current = entry.isIntersecting
      if (entry.isIntersecting)
        updateTransform()
    }, { rootMargin: '100% 0px' })
    if (galleryRef.current)
      observer.observe(galleryRef.current)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [updateTransform])

  return (
    <section
      id="gallery"
      ref={galleryRef}
      className="relative bg-background"
      style={{ height: 'var(--gallery-height, 100vh)' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="flex h-full items-center">
          <div
            ref={containerRef}
            className="flex gap-6 px-6"
            style={{
              transform: 'translate3d(var(--gallery-x, 0px), 0, 0)',
              WebkitTransform: 'translate3d(var(--gallery-x, 0px), 0, 0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              perspective: 1000,
              WebkitPerspective: 1000,
              touchAction: 'pan-y',
            }}
          >
            {images.map((image, index) => (
              <div
                key={index}
                className="relative h-[70vh] w-[85vw] flex-shrink-0 overflow-hidden rounded-2xl md:w-[60vw] lg:w-[45vw]"
                style={{
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                }}
              >
                <Image
                  src={image.src || '/placeholder.svg'}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 85vw, (max-width: 1024px) 60vw, 45vw"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
