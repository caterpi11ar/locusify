import type { LivePhotoVideoHandle } from './LivePhotoVideo'
import type { VideoSource } from '@/types/map'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'
import { Thumbhash } from '../thumbhash'
import { LivePhotoBadge } from './LivePhotoBadge'
import { LivePhotoVideo } from './LivePhotoVideo'

export type { LivePhotoVideoHandle } from './LivePhotoVideo'

export interface LazyMediaProps {
  src: string
  alt: string
  thumbHash?: string | null
  className?: string
  style?: React.CSSProperties
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
  onLoad?: () => void
  onError?: () => void
  rootMargin?: string
  threshold?: number
  /** Video source for Live Photo / Motion Photo */
  videoSource?: VideoSource
  /** Local File for motion photo extraction */
  imageFile?: File
  /** Show the Live badge */
  showBadge?: boolean
  /** Enable hover-to-play on desktop */
  hoverToPlay?: boolean
}

export function LazyMedia({
  src,
  alt,
  thumbHash,
  className,
  style,
  objectFit = 'cover',
  onLoad,
  onError,
  rootMargin = '50px',
  threshold = 0.1,
  videoSource,
  imageFile,
  showBadge = true,
  hoverToPlay = false,
}: LazyMediaProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const livePhotoRef = useRef<LivePhotoVideoHandle>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin,
    threshold,
  })

  const isStandaloneVideo = !!videoSource && videoSource.type === 'video'
  const hasVideo = !!videoSource && videoSource.type !== 'none'

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  const handleMouseEnter = useCallback(() => {
    if (!hoverToPlay || !hasVideo)
      return
    hoverTimerRef.current = setTimeout(() => {
      livePhotoRef.current?.play()
    }, 200)
  }, [hoverToPlay, hasVideo])

  const handleMouseLeave = useCallback(() => {
    if (!hoverToPlay || !hasVideo)
      return
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    if (isPlaying) {
      livePhotoRef.current?.stop()
    }
  }, [hoverToPlay, hasVideo, isPlaying])

  const shouldLoadImage = inView && !hasError

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
  }[objectFit]

  // Standalone video: render <video> as primary content
  if (isStandaloneVideo && videoSource.type === 'video') {
    return (
      <div
        ref={ref}
        className={cn('group relative overflow-hidden', className)}
        style={style}
      >
        {/* Thumbhash placeholder */}
        {thumbHash && !isLoaded && (
          <Thumbhash
            thumbHash={thumbHash}
            className="absolute inset-0 scale-110 blur-sm"
          />
        )}

        {/* Video element as primary content */}
        {inView && (
          <video
            src={videoSource.videoUrl}
            className={cn(
              `size-full ${objectFitClass} transition-opacity duration-300`,
              isLoaded ? 'opacity-100' : 'opacity-0',
            )}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => {
              setIsLoaded(true)
              onLoad?.()
            }}
            onError={() => {
              setHasError(true)
              onError?.()
            }}
          />
        )}

        {/* Video badge */}
        {isLoaded && showBadge && (
          <div className="absolute top-2 left-2 z-20 flex items-center space-x-1 rounded-xl bg-black/50 px-1 py-1 text-xs text-white">
            <i className="i-mingcute-video-line size-4" />
            <span className="mr-1">{t('photo.video.badge')}</span>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Failed to load video
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn('group relative overflow-hidden', className)}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbhash placeholder */}
      {thumbHash && !isLoaded && (
        <Thumbhash
          thumbHash={thumbHash}
          className="absolute inset-0 scale-110 blur-sm"
        />
      )}

      {/* Actual image */}
      {shouldLoadImage && (
        <img
          src={src}
          alt={alt}
          className={cn(
            `size-full ${objectFitClass} transition-opacity duration-300`,
            isLoaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Live Photo video overlay */}
      {hasVideo && isLoaded && (
        <LivePhotoVideo
          ref={livePhotoRef}
          videoSource={videoSource!}
          imageFile={imageFile}
          isCurrentImage={inView}
          className={objectFit === 'cover' ? 'object-cover' : 'object-contain'}
          onPlayingChange={setIsPlaying}
        />
      )}

      {/* Live Photo badge */}
      {hasVideo && isLoaded && showBadge && (
        <LivePhotoBadge
          livePhotoRef={livePhotoRef}
          isLivePhotoPlaying={isPlaying}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Failed to load image
          </span>
        </div>
      )}
    </div>
  )
}
