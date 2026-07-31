import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const SITE_URL = 'https://app.locusify.cn'

type SeoLocale = 'en' | 'zh-CN'

const seo = {
  'en': {
    htmlLang: 'en',
    ogLocale: 'en_US',
    title: 'GPS Photo Map & Travel Route Video Maker | Locusify',
    description: 'Turn GPS-tagged travel photos into an interactive route map, animated journey replay, and MP4 travel video. Private in-browser processing with Locusify.',
    keywords: 'GPS photo map, travel route map, photo map maker, travel video maker, journey replay, EXIF GPS, geotagged photos, travel vlog generator',
    appDescription: 'Locusify is a browser-based GPS photo map and travel video maker. It turns geotagged photos into interactive route maps, animated journey replays, and downloadable MP4 videos while processing photos locally on the user’s device.',
    features: [
      'Create an interactive route map from GPS-tagged photos',
      'Replay a journey chronologically with an animated trajectory',
      'Export the journey replay as an MP4 travel video',
      'Process photos and EXIF location data locally in the browser',
      'Use JPG, PNG, HEIC, WebP, and AVIF photos',
    ],
    faq: [
      ['What is Locusify?', 'Locusify is a web app that reads GPS coordinates from travel photos and turns them into an interactive route map, animated journey replay, and downloadable MP4 video.'],
      ['Does Locusify upload my travel photos?', 'Photo and EXIF processing happens locally in your browser. Your photos do not need to be uploaded to create a route map or journey replay.'],
      ['Which photo formats does Locusify support?', 'Locusify supports JPG, PNG, HEIC, WebP, and AVIF. A route replay requires at least two photos with valid GPS location data.'],
      ['Can I make a travel video from my photos?', 'Yes. After creating a GPS photo route, you can replay the journey chronologically and export the animation as an MP4 travel video.'],
      ['Is Locusify available in Chinese and English?', 'Yes. The Locusify interface and product information are available in English and Simplified Chinese.'],
    ],
  },
  'zh-CN': {
    htmlLang: 'zh-CN',
    ogLocale: 'zh_CN',
    title: 'GPS 照片地图与旅行轨迹视频制作工具 | Locusify',
    description: '用 Locusify 将带 GPS 定位的旅行照片自动生成互动路线地图、动态轨迹回放和 MP4 旅行视频。照片与 EXIF 数据均在浏览器本地处理。',
    keywords: 'GPS照片地图, 旅行轨迹地图, 照片地图制作, 旅行视频制作, 足迹地图, EXIF定位, 旅行vlog生成器, 轨迹回放',
    appDescription: 'Locusify 是一款基于浏览器的 GPS 照片地图和旅行视频制作工具，可将带定位信息的照片生成互动路线地图、动态旅程回放和可下载的 MP4 视频，并在用户设备上本地处理照片。',
    features: [
      '根据带 GPS 定位的照片自动生成互动路线地图',
      '按拍摄时间顺序动态回放旅行轨迹',
      '将旅程轨迹回放导出为 MP4 旅行视频',
      '在浏览器本地处理照片和 EXIF 定位数据',
      '支持 JPG、PNG、HEIC、WebP 和 AVIF 照片',
    ],
    faq: [
      ['Locusify 是什么？', 'Locusify 是一款网页应用，可读取旅行照片中的 GPS 坐标，并生成互动路线地图、动态旅程回放和可下载的 MP4 视频。'],
      ['Locusify 会上传我的旅行照片吗？', '照片和 EXIF 信息均在浏览器本地处理。创建路线地图或旅程回放无需上传照片。'],
      ['Locusify 支持哪些照片格式？', 'Locusify 支持 JPG、PNG、HEIC、WebP 和 AVIF。生成轨迹回放至少需要两张包含有效 GPS 定位的照片。'],
      ['可以把照片制作成旅行视频吗？', '可以。生成 GPS 照片路线后，你可以按时间顺序回放旅程，并将动画导出为 MP4 旅行视频。'],
      ['Locusify 支持中文和英文吗？', '支持。Locusify 的界面和产品信息均提供英文与简体中文版本。'],
    ],
  },
} as const

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value))
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector)
  if (!element) {
    element = document.createElement('link')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value))
}

function localizedPath(locale: SeoLocale) {
  return locale === 'zh-CN' ? '/zh-CN/' : '/en/'
}

export function SeoManager() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const updateSeo = () => {
      const locale: SeoLocale = i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
      const content = seo[locale]
      const canonical = `${SITE_URL}${localizedPath(locale)}`

      document.documentElement.lang = content.htmlLang
      document.title = content.title

      upsertMeta('meta[name="description"]', { name: 'description', content: content.description })
      upsertMeta('meta[name="keywords"]', { name: 'keywords', content: content.keywords })
      const isPrivateRoute = window.location.pathname.startsWith('/auth/') || window.location.pathname === '/reset-password'
      upsertMeta('meta[name="robots"]', {
        name: 'robots',
        content: isPrivateRoute
          ? 'noindex, nofollow, noarchive'
          : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      })
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: content.title })
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: content.description })
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
      upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: content.ogLocale })
      upsertMeta('meta[property="og:locale:alternate"]', { property: 'og:locale:alternate', content: locale === 'en' ? 'zh_CN' : 'en_US' })
      upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: content.title })
      upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: content.description })
      upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonical })

      upsertLink('link[rel="alternate"][hreflang="en"]', { rel: 'alternate', hreflang: 'en', href: `${SITE_URL}/en/` })
      upsertLink('link[rel="alternate"][hreflang="zh-CN"]', { rel: 'alternate', hreflang: 'zh-CN', href: `${SITE_URL}/zh-CN/` })
      upsertLink('link[rel="alternate"][hreflang="x-default"]', { rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/en/` })

      const graph = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            'name': 'Locusify',
            'url': SITE_URL,
            'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/logo.png`, 'width': 256, 'height': 256 },
            'sameAs': ['https://github.com/caterpi11ar/locusify', 'https://www.producthunt.com/products/locusify'],
          },
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            'url': SITE_URL,
            'name': 'Locusify',
            'inLanguage': ['en', 'zh-CN'],
            'publisher': { '@id': `${SITE_URL}/#organization` },
          },
          {
            '@type': 'WebApplication',
            '@id': `${canonical}#app`,
            'name': 'Locusify',
            'url': canonical,
            'description': content.appDescription,
            'applicationCategory': 'TravelApplication',
            'applicationSubCategory': 'GPS photo map and travel video maker',
            'browserRequirements': 'Requires a modern web browser with JavaScript enabled',
            'operatingSystem': 'Any',
            'inLanguage': content.htmlLang,
            'image': `${SITE_URL}/og-image.png`,
            'screenshot': `${SITE_URL}/og-image.png`,
            'featureList': [...content.features],
            'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': locale === 'zh-CN' ? 'CNY' : 'USD', 'availability': 'https://schema.org/InStock' },
            'publisher': { '@id': `${SITE_URL}/#organization` },
          },
          {
            '@type': 'FAQPage',
            '@id': `${canonical}#faq`,
            'inLanguage': content.htmlLang,
            'mainEntity': content.faq.map(([name, text]) => ({
              '@type': 'Question',
              name,
              'acceptedAnswer': { '@type': 'Answer', text },
            })),
          },
        ],
      }

      const schema = document.getElementById('locusify-structured-data') ?? document.createElement('script')
      schema.id = 'locusify-structured-data'
      schema.setAttribute('type', 'application/ld+json')
      schema.textContent = JSON.stringify(graph)
      if (!schema.parentNode)
        document.head.appendChild(schema)
    }

    updateSeo()
    i18n.on('languageChanged', updateSeo)
    return () => i18n.off('languageChanged', updateSeo)
  }, [i18n])

  return null
}

export function getLocalizedPath(language: string) {
  return language.toLowerCase().startsWith('zh') ? '/zh-CN/' : '/en/'
}
