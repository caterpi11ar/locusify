import { useMemo } from 'react'
import { thumbHashToDataURL } from 'thumbhash'
import { cn } from '@/lib/utils'

export function Thumbhash({
  thumbHash,
  className,
}: {
  thumbHash: ArrayLike<number> | string
  className?: string
}) {
  const decompressUint8Array = (compressed: string) => {
    return Uint8Array.from(
      compressed.match(/.{1,2}/g)!.map(byte => Number.parseInt(byte, 16)),
    )
  }

  const dataURL = useMemo(() => {
    if (typeof thumbHash === 'string') {
      return thumbHashToDataURL(decompressUint8Array(thumbHash))
    }
    return thumbHashToDataURL(thumbHash)
  }, [thumbHash])

  return <img alt="Thumbhash" src={dataURL} className={cn('size-full', className)} />
}
