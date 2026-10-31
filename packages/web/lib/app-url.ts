import { env } from '@/lib/env'

/** Configured application URL, also used in structured metadata. */
export const APP_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

/** Keep the website language explicit without dropping campaign parameters. */
export function localizedAppUrl(locale: string) {
  const url = new URL(APP_URL)
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${locale === 'zh' ? 'zh-CN' : 'en'}/`
  return url.toString()
}
