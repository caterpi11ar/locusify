import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import React from 'react'
import { JsonLd } from '@/components/json-ld'
import { routing } from '@/i18n/routing'
import { APP_URL } from '@/lib/app-url'
import {
  ORGANIZATION_ID,
  PERSON_ID,
  rssUrl,
  SITE_NAME,
  SITE_URL,
  SOFTWARE_ID,
  toSiteLocale,
  WEBSITE_ID,
} from '@/lib/site'
import '../globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const BASE_URL = SITE_URL

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  const title = t('site.title')
  const description = t('site.description')
  const canonicalUrl = locale === 'zh' ? BASE_URL : `${BASE_URL}/en`

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    icons: {
      icon: [
        { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      ],
      apple: '/apple-icon.png',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'zh': BASE_URL,
        'en': `${BASE_URL}/en`,
        'x-default': BASE_URL,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Locusify',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN',
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    verification: {
      google: 'by9hGLiRBrIQCeNmcjRon0Q3q8uJP7mxau9oh1seY3w',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  const htmlLang = locale === 'zh' ? 'zh-CN' : 'en'

  const description = locale === 'zh'
    ? '将 GPS 照片转化为交互式路线地图和动画旅程回放。照片定位、轨迹可视化、视频导出均在设备本地处理。'
    : 'Turn GPS photos into interactive route maps and animated journey replays with on-device photo mapping, route visualization, and video export.'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        'name': SITE_NAME,
        'url': SITE_URL,
        'logo': {
          '@type': 'ImageObject',
          'url': `${SITE_URL}/logo.png`,
        },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        'name': 'caterpi11ar',
        'url': 'https://github.com/caterpi11ar',
        'worksFor': { '@id': ORGANIZATION_ID },
        'sameAs': ['https://github.com/caterpi11ar'],
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        'name': SITE_NAME,
        'url': SITE_URL,
        'description': description,
        'inLanguage': ['zh-CN', 'en-US'],
        'publisher': { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': SOFTWARE_ID,
        'name': SITE_NAME,
        'applicationCategory': 'TravelApplication',
        'operatingSystem': 'Web, iOS, Android',
        'description': description,
        'url': APP_URL,
        'image': `${SITE_URL}/og-image.png`,
        'isPartOf': { '@id': WEBSITE_ID },
        'author': { '@id': ORGANIZATION_ID },
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
        },
      },
    ],
  }

  return (
    <html lang={htmlLang} className={inter.variable}>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={locale === 'zh' ? 'Locusify 旅行地图博客 RSS' : 'Locusify Travel Map Blog RSS'}
          href={rssUrl(toSiteLocale(locale))}
        />
        <link rel="preconnect" href={APP_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={APP_URL} />
        <JsonLd data={jsonLd} />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
