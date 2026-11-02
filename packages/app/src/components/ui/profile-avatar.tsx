import type { ComponentProps } from 'react'
import { brandImageClasses, brandLogo, isBrandAvatar } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Apply brand treatment only to the fallback, preserving personal avatar styles. */
export function ProfileAvatar({ src, className, alt, ...props }: ComponentProps<'img'>) {
  const branded = isBrandAvatar(src)
  return (
    <img
      {...props}
      src={branded ? brandLogo : src}
      alt={alt}
      className={cn(className, branded && brandImageClasses)}
    />
  )
}
