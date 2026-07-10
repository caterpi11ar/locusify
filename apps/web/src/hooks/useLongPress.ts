import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  delay?: number
  threshold?: number
}

export function useLongPress(
  callback: (info: { clientX: number, clientY: number }) => void,
  options: UseLongPressOptions = {},
) {
  const { delay = 500, threshold = 10 } = options
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef<{ x: number, y: number } | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPos.current = null
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      clear()
      return
    }
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }

    timerRef.current = setTimeout(() => {
      callbackRef.current({ clientX: touch.clientX, clientY: touch.clientY })
      navigator.vibrate?.(10)
      timerRef.current = null
    }, delay)
  }, [delay, clear])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current || !timerRef.current)
      return
    const touch = e.touches[0]
    const dx = touch.clientX - startPos.current.x
    const dy = touch.clientY - startPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > threshold) {
      clear()
    }
  }, [threshold, clear])

  const onTouchEnd = useCallback(() => {
    clear()
  }, [clear])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
