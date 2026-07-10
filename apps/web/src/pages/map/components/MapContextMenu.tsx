import { ImagePlus } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { glassPanel } from '@/lib/utils'

interface MapContextMenuProps {
  position: { x: number, y: number } | null
  onAddPhotos: () => void
  onClose: () => void
}

/**
 * Custom context menu for the map area.
 *
 * Radix ContextMenu cannot be used here because MapLibre GL JS calls
 * `event.preventDefault()` on the native `contextmenu` event (to suppress the
 * browser menu). Radix's `composeEventHandlers` then sees `defaultPrevented`
 * and skips opening the menu. Instead we render a portal positioned at the
 * cursor coordinates provided by MapLibre's `onContextMenu` callback.
 */
export function MapContextMenu({ position, onAddPhotos, onClose }: MapContextMenuProps) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)

  // Clamp menu position so it stays within the viewport
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!position || !el)
      return
    const { width, height } = el.getBoundingClientRect()
    let x = position.x
    let y = position.y
    if (x + width > window.innerWidth)
      x = position.x - width
    if (y + height > window.innerHeight)
      y = position.y - height
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }, [position])

  // Focus the menu when it appears for keyboard accessibility
  useEffect(() => {
    if (position) {
      menuRef.current?.focus()
    }
  }, [position])

  if (!position)
    return null

  return createPortal(
    <>
      {/* Invisible backdrop — captures outside taps/clicks to dismiss */}
      <div
        className="fixed inset-0 z-50"
        onPointerDown={onClose}
      />
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        className={`fixed z-50 overflow-hidden p-1 outline-hidden animate-in fade-in-0 zoom-in-95 ${glassPanel}`}
        style={{ left: position.x, top: position.y }}
      >
        <button
          type="button"
          role="menuitem"
          className="text-text relative flex w-full cursor-default items-center gap-2 rounded-xl px-3 py-2 text-sm outline-hidden select-none transition-colors hover:bg-fill-secondary active:bg-fill-tertiary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-secondary"
          onClick={() => {
            onAddPhotos()
            onClose()
          }}
        >
          <ImagePlus />
          {t('map.contextMenu.addPhotos')}
        </button>
      </div>
    </>,
    document.body,
  )
}
