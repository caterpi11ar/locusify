'use client'

import type { ImageProps } from 'next/image'
import Image from 'next/image'
import { useState } from 'react'

interface FadeImageProps extends Omit<
  ImageProps,
  | 'onLoad'
  | 'onLoadingComplete'
  | 'priority'
  | 'layout'
  | 'objectFit'
  | 'objectPosition'
  | 'lazyBoundary'
  | 'lazyRoot'
> {
  fadeDelay?: number
}

export function FadeImage({ className, fadeDelay = 0, ...props }: FadeImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden bg-secondary">
      <Image
        {...props}
        loading={props.preload ? undefined : (props.loading ?? 'lazy')}
        className={`${className || ''} transition-all duration-700 ease-out ${
          isLoaded ? 'scale-100 blur-0' : 'scale-[1.02] blur-sm'
        }`}
        onLoad={() => {
          if (fadeDelay > 0)
            window.setTimeout(setIsLoaded, fadeDelay, true)
          else
            setIsLoaded(true)
        }}
      />
    </div>
  )
}
