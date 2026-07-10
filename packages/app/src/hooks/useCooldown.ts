import { useCallback, useEffect, useRef, useState } from 'react'

const COOLDOWN_SECONDS = 60

export function useCooldown(seconds = COOLDOWN_SECONDS) {
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current)
        clearInterval(timerRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(seconds)
    if (timerRef.current)
      clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [seconds])

  return { cooldown, startCooldown }
}
