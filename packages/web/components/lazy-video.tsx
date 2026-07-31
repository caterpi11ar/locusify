'use client'

import { useEffect, useRef, useState } from 'react'

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string
}

export function LazyVideo({ src, className, ...props }: LazyVideoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inViewportRef = useRef(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el)
      return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inViewportRef.current = true
          setIsVisible(true)
          if (!document.hidden)
            void videoRef.current?.play()
        }
        else {
          inViewportRef.current = false
          videoRef.current?.pause()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    const handleVisibility = () => {
      if (document.hidden)
        videoRef.current?.pause()
      else if (inViewportRef.current)
        void videoRef.current?.play()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div ref={ref} className="relative h-full w-full">
      {isVisible && (
        <video ref={videoRef} src={src} className={className} preload="metadata" {...props} />
      )}
    </div>
  )
}
