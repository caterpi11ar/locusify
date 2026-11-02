'use client'

import { useEffect, useState } from 'react'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { Header } from '@/components/header'

const DISMISSED_KEY = 'locusify-announcement-dismissed'

export function SiteHeader() {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true)

  useEffect(() => {
    setIsAnnouncementVisible(sessionStorage.getItem(DISMISSED_KEY) !== 'true')
  }, [])

  const closeAnnouncement = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    document.documentElement.dataset.announcementDismissed = 'true'
    setIsAnnouncementVisible(false)
  }

  return (
    <>
      {isAnnouncementVisible && <AnnouncementBanner onClose={closeAnnouncement} />}
      <Header hasAnnouncement={isAnnouncementVisible} />
    </>
  )
}
