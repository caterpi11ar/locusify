import { useEffect, useState } from 'react'

// Match Tailwind's sm breakpoint; its complement includes fractional widths.
const DESKTOP_MEDIA_QUERY = '(min-width: 40rem)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches)
    setIsMobile(!mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
