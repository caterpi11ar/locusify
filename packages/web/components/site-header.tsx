'use client'

import { useEffect, useState } from 'react'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { Header } from '@/components/header'

const DISMISSED_KEY = 'locusify-announcement-dismissed'

export function SiteHeader() {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true)

  useEffect(() => {
    try {
      setIsAnnouncementVisible(sessionStorage.getItem(DISMISSED_KEY) !== 'true')
    }
    catch { /* Storage is optional for dismissal. */ }
  }, [])

  const closeAnnouncement = () => {
    if (document.querySelector('[data-announcement-banner]')?.contains(document.activeElement)) {
      const target = document.querySelector<HTMLElement>('[data-home-link]') ?? document.querySelector<HTMLElement>('main')
      if (target) {
        if (target.tagName === 'MAIN')
          target.tabIndex = -1
        target.focus({ preventScroll: true })
        if (target.tagName === 'MAIN')
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
      }
    }
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true')
    }
    catch { /* Keep the current page usable when storage is unavailable. */ }
    document.documentElement.dataset.announcementDismissed = 'true'
    setIsAnnouncementVisible(false)
  }

  return (
    <>
      {isAnnouncementVisible && <AnnouncementBanner onClose={closeAnnouncement} />}
      <Header mode="home" />
    </>
  )
}
