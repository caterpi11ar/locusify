import { env } from '@/lib/env'

export const SITE_NAME = 'Locusify'
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`
export const PERSON_ID = `${SITE_URL}/#person`
export const SOFTWARE_ID = `${SITE_URL}/#software`

export type SiteLocale = 'zh' | 'en'

export function toSiteLocale(locale: string): SiteLocale {
  return locale === 'en' ? 'en' : 'zh'
}

export function localizedPath(locale: SiteLocale, path = '') {
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  return locale === 'zh' ? normalizedPath || '/' : `/en${normalizedPath}`
}

export function absoluteUrl(locale: SiteLocale, path = '') {
  return new URL(localizedPath(locale, path), SITE_URL).toString()
}

export function rssUrl(locale: SiteLocale) {
  return locale === 'zh' ? `${SITE_URL}/rss.xml` : `${SITE_URL}/en/rss.xml`
}
