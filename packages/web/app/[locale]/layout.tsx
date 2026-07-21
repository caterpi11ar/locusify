import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Inter, Noto_Sans_SC } from 'next/font/google'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import React from 'react'
import { routing } from '@/i18n/routing'
import { APP_URL } from '@/lib/app-url'
import '../globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
})

const BASE_URL = 'https://app.locusify.cn'

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
          url: '/images/travel-hero-main.jpg',
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
      images: ['/images/travel-hero-main.jpg'],
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Locusify',
    'applicationCategory': 'TravelApplication',
    'operatingSystem': 'Web, iOS, Android',
    'description':
      locale === 'zh'
        ? '将 GPS 照片转化为交互式路线地图和动画旅程回放。照片定位、轨迹可视化、视频导出，100% 本地处理，隐私安全。'
        : 'Turn GPS photos into interactive route maps and animated journey replays. Map travel photos, visualize routes, export videos. 100% on-device processing.',
    'url': BASE_URL,
    'image': `${BASE_URL}/images/travel-hero-main.jpg`,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
    'author': {
      '@type': 'Organization',
      'name': 'caterpi11ar',
      'url': BASE_URL,
    },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity':
      locale === 'zh'
        ? [
            {
              '@type': 'Question',
              'name': 'Locusify 如何将我的旅行照片定位到地图上？',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Locusify 读取照片 EXIF 中嵌入的 GPS 坐标，然后将每张照片标注在交互地图上，自动连接各点形成旅行路线——全部在你的设备本地处理。',
              },
            },
            {
              '@type': 'Question',
              'name': 'Locusify 免费吗？',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': '是的！GPS 照片定位、交互地图和基础轨迹回放等核心功能完全免费。专业版和旗舰版解锁无限上传、高清/4K 导出和高级功能。',
              },
            },
            {
              '@type': 'Question',
              'name': 'Locusify 会上传我的照片到服务器吗？',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': '不会。所有处理 100% 在你的设备本地完成。你的照片绝不会离开手机或电脑。我们不收集任何数据——关闭应用，一切即消失。',
              },
            },
            {
              '@type': 'Question',
              'name': 'Locusify 支持哪些照片格式？',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Locusify 支持 JPEG、PNG、HEIC、WebP 和 AVIF。任何包含 GPS 数据的照片都可以使用。专业版支持更多格式和批量处理。',
              },
            },
            {
              '@type': 'Question',
              'name': '轨迹回放动画是怎么工作的？',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Locusify 按时间顺序排列你的照片，在地图上描绘路线，播放动画旅程回放。你可以控制播放速度，并将动画导出为可分享的视频。',
              },
            },
            {
              '@type': 'Question',
              'name': '我可以将旅行路线导出为视频吗？',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': '可以！你可以将路线回放动画录制为视频并下载或直接分享。免费版支持基础导出，专业版支持 1080p，旗舰版支持 4K 画质。',
              },
            },
          ]
        : [
            {
              '@type': 'Question',
              'name': 'How does Locusify map my travel photos?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Locusify reads GPS coordinates embedded in your photo EXIF data, then plots each photo on an interactive map. It automatically connects the dots to visualize your travel route — all processed locally on your device.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Is Locusify free to use?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Yes! Core features like GPS photo location mapping, interactive maps, and basic route replay are completely free. Pro and Flagship plans unlock unlimited uploads, HD/4K export, and advanced features.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Does Locusify upload my photos to a server?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'No. All processing happens 100% on your device. Your photos never leave your phone or computer. We don\'t collect any data — close the app and everything disappears.',
              },
            },
            {
              '@type': 'Question',
              'name': 'What photo formats does Locusify support?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Locusify supports JPEG, PNG, HEIC, WebP, and AVIF. Any photo with embedded GPS data will work. Pro plans add support for additional formats and batch processing.',
              },
            },
            {
              '@type': 'Question',
              'name': 'How does the route replay animation work?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Locusify arranges your photos in chronological order, traces the route on the map, and plays an animated journey replay. You can control playback speed and export the animation as a shareable video.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Can I export my travel route as a video?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Yes! You can record your route replay animation as a video and download or share it directly. Free users get basic export, Pro gets 1080p, and Flagship gets 4K quality.',
              },
            },
          ],
  }

  return (
    <html lang={htmlLang} className={`${inter.variable} ${notoSansSC.variable}`}>
      <head>
        <link rel="preconnect" href={APP_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={APP_URL} />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZMTQE5Z6W9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZMTQE5Z6W9');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
        <Script
          id="bmc-widget"
          src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
          strategy="lazyOnload"
          data-name="BMC-Widget"
          data-cfasync="false"
          data-id="daiqin1046z"
          data-description="Support me on Buy me a coffee!"
          data-message=""
          data-color="#5F7FFF"
          data-position="Right"
          data-x_margin="18"
          data-y_margin="18"
        />
      </body>
    </html>
  )
}
