import type { VideoSource } from '@/types/map'
import { m, useAnimationControls } from 'motion/react'
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { extractMotionPhotoVideo, extractMotionPhotoVideoFromFile } from '@/lib/motion-photo-extractor'
import { cn } from '@/lib/utils'
import { convertMovToMp4, needsVideoConversion } from '@/lib/video-converter'

interface LivePhotoVideoProps {
  videoSource: VideoSource
  /** Local File object for motion photo extraction */
  imageFile?: File
  /** Whether this is the current/visible image */
  isCurrentImage: boolean
  className?: string
  onPlayingChange?: (isPlaying: boolean) => void
  /** Auto-play the video once after loading */
  shouldAutoPlayOnce?: boolean
}

export interface LivePhotoVideoHandle {
  play: () => void
  stop: () => void
  getIsVideoLoaded: () => boolean
}

export function LivePhotoVideo({
  ref,
  videoSource,
  imageFile,
  isCurrentImage,
  className,
  onPlayingChange,
  shouldAutoPlayOnce = false,
}: LivePhotoVideoProps & {
  ref?: React.RefObject<LivePhotoVideoHandle | null>
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const hasAutoPlayedRef = useRef(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const videoAnimateController = useAnimationControls()
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    onPlayingChange?.(isPlaying)
  }, [isPlaying, onPlayingChange])

  // Process video source when becoming current
  useEffect(() => {
    if (!isCurrentImage || videoLoaded || isProcessing || !videoRef.current)
      return
    if (videoSource.type === 'none')
      return

    let cancelled = false
    setIsProcessing(true)

    const processVideo = async () => {
      try {
        const video = videoRef.current!
        let videoUrl: string | null = null

        if (videoSource.type === 'live-photo') {
          // Apple Live Photo: separate .mov file
          if (needsVideoConversion(videoSource.videoUrl)) {
            const result = await convertMovToMp4(videoSource.videoUrl)
            if (result.success && result.videoUrl) {
              videoUrl = result.videoUrl
            }
          }
          else {
            videoUrl = videoSource.videoUrl
          }
        }
        else if (videoSource.type === 'video') {
          // Standalone video: use videoUrl directly
          videoUrl = videoSource.videoUrl
        }
        else if (videoSource.type === 'motion-photo') {
          // Google Motion Photo: embedded in image
          if (imageFile) {
            videoUrl = await extractMotionPhotoVideoFromFile(
              imageFile,
              videoSource.offset,
              videoSource.size,
            )
          }
          else {
            videoUrl = await extractMotionPhotoVideo(
              videoSource.imageUrl,
              videoSource.offset,
              videoSource.size,
            )
          }
        }

        if (cancelled)
          return

        if (videoUrl) {
          // Revoke previous blob URL before setting new one
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
          }
          // Only track blob URLs we created (not direct video URLs)
          blobUrlRef.current = videoUrl.startsWith('blob:') ? videoUrl : null
          video.src = videoUrl
          setVideoLoaded(true)
        }
      }
      catch (error) {
        if (!cancelled) {
          console.error('Failed to process video:', error)
        }
      }
      finally {
        if (!cancelled) {
          setIsProcessing(false)
        }
      }
    }

    processVideo()

    return () => {
      cancelled = true
    }
  }, [isCurrentImage, videoLoaded, isProcessing, videoSource, imageFile])

  // Reset state when no longer current
  useEffect(() => {
    if (!isCurrentImage) {
      setIsPlaying(false)
      setVideoLoaded(false)
      setIsProcessing(false)
      hasAutoPlayedRef.current = false
      videoAnimateController.set({ opacity: 0 })

      // Cleanup blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [isCurrentImage, videoAnimateController])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  const play = useCallback(async () => {
    if (!videoLoaded || isPlaying || isProcessing)
      return
    setIsPlaying(true)
    setTimeout(async () => {
      await videoAnimateController.start({
        opacity: 1,
        transition: { duration: 0.15, ease: 'easeOut' },
      })
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})
      }
    }, 0)
  }, [videoLoaded, isPlaying, isProcessing, videoAnimateController])

  const stop = useCallback(async () => {
    if (!isPlaying)
      return
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    await videoAnimateController.start({
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' },
    })
    setIsPlaying(false)
  }, [isPlaying, videoAnimateController])

  // Auto-play once when video is loaded
  useEffect(() => {
    if (
      shouldAutoPlayOnce
      && isCurrentImage
      && videoLoaded
      && !isPlaying
      && !isProcessing
      && !hasAutoPlayedRef.current
    ) {
      hasAutoPlayedRef.current = true
      play()
    }
  }, [shouldAutoPlayOnce, isCurrentImage, videoLoaded, isPlaying, isProcessing, play])

  useImperativeHandle(ref, () => ({
    play,
    stop,
    getIsVideoLoaded: () => videoLoaded,
  }))

  const handleVideoEnded = useCallback(() => {
    stop()
  }, [stop])

  return (
    <m.video
      ref={videoRef}
      className={cn('pointer-events-none absolute inset-0 z-10 h-full w-full object-contain', className)}
      muted
      playsInline
      onEnded={handleVideoEnded}
      initial={{ opacity: 0 }}
      animate={videoAnimateController}
    />
  )
}
