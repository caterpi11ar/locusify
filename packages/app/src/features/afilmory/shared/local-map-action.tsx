import type { PropsWithChildren } from 'react'
import type { PhotoMarker } from '@/types/map'
import { createContext, useContext } from 'react'

export const MapPhotoActionContext = createContext<(marker: PhotoMarker) => void>(() => {})
export function LocalPhotoLink({ marker, children, className }: PropsWithChildren<{ marker: PhotoMarker, className?: string }>) {
  const open = useContext(MapPhotoActionContext)
  return <button type="button" className={className} onClick={() => open(marker)}>{children}</button>
}
