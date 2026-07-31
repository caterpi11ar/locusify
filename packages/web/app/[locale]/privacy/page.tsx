import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Header } from '@/components/header'
import { JsonLd } from '@/components/json-ld'
import { FooterSection } from '@/components/sections/footer-section'
import { absoluteUrl, SITE_NAME, toSiteLocale, WEBSITE_ID } from '@/lib/site'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const currentLocale = toSiteLocale(locale)
  const isZh = currentLocale === 'zh'
  const title = isZh ? '隐私政策 | Locusify' : 'Privacy Policy | Locusify'
  const description = isZh
    ? '了解 Locusify 官网与应用如何处理账户、照片、位置、访问分析和托管日志，以及你可以行使的数据权利。'
    : 'Learn how the Locusify website and app handle account, photo, location, analytics, and hosting data, and how to exercise your privacy rights.'
  const canonical = absoluteUrl(currentLocale, '/privacy')

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'zh': absoluteUrl('zh', '/privacy'),
        'en': absoluteUrl('en', '/privacy'),
        'x-default': absoluteUrl('zh', '/privacy'),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}

const content = {
  zh: {
    title: '隐私政策',
    effective: '生效日期：2026 年 7 月 31 日',
    sections: [
      ['我们的承诺', ['Locusify 以数据最小化为原则。照片的 EXIF、GPS 坐标、路线计算和地图渲染在你的设备本地完成，原始照片不会上传到 Locusify 的照片处理服务器。']],
      ['我们处理的信息', ['官网使用 Vercel Web Analytics 获取不使用 Cookie 的聚合访问指标，例如页面访问量、来源页面、设备和国家或地区的大致统计。托管与安全服务可能短期处理 IP 地址、User-Agent、请求时间和访问路径等标准请求日志。', '当你使用交互式应用并创建账户时，我们会处理电子邮箱和身份验证所需信息。照片和其中的位置数据仅在设备本地用于地图与路线回放。']],
      ['用途与法律依据', ['账户信息用于履行服务合同和保障账户安全；聚合分析和必要日志用于网站运行、安全防护与产品改进，依据我们的合法利益处理。我们不出售个人信息，也不将照片或位置数据用于广告画像。']],
      ['共享与保留', ['网站托管和聚合分析由 Vercel 提供，其只在提供这些服务所需范围内处理数据。账户数据保留至账户删除或不再提供服务；安全日志按托管服务商的有限保留周期处理；聚合分析不用于识别个人。']],
      ['你的选择与权利', ['你可以请求访问、更正或删除账户相关数据，并可通过浏览器的 Global Privacy Control 信号表达拒绝出售或共享数据的选择。Locusify 不出售个人数据，也不会因该选择降低服务。']],
      ['第三方链接', ['GitHub、Buy Me a Coffee 等外部链接仅在你主动点击时打开，其数据处理受各自隐私政策约束。本站的 Referrer-Policy 会限制跨站请求携带的来源信息。']],
      ['联系我们', ['如需行使权利或咨询隐私问题，请通过 Locusify GitHub 仓库的 Issues 或 Security Advisory 联系我们。我们可能更新本政策，并在此页面标注新的生效日期。']],
    ],
  },
  en: {
    title: 'Privacy Policy',
    effective: 'Effective: July 31, 2026',
    sections: [
      ['Our commitment', ['Locusify follows data-minimization principles. Photo EXIF parsing, GPS coordinates, route calculation, and map rendering happen locally on your device. Original photos are not uploaded to a Locusify photo-processing server.']],
      ['Information we process', ['The website uses Vercel Web Analytics for aggregate, cookieless traffic metrics such as page views, referrers, device categories, and approximate country or region. Hosting and security providers may temporarily process standard request logs such as IP address, user agent, request time, and path.', 'When you use the interactive app and create an account, we process your email address and authentication information. Photos and their location data remain on your device and are used locally for maps and route replay.']],
      ['Purposes and legal bases', ['Account information is used to perform the service contract and protect account security. Aggregate analytics and necessary logs support website operation, security, and product improvement under our legitimate interests. We do not sell personal information or use photo or location data for advertising profiles.']],
      ['Sharing and retention', ['Vercel provides website hosting and aggregate analytics and processes data only as needed to provide those services. Account data is retained until account deletion or the service is discontinued; security logs follow the provider’s limited retention schedule; aggregate analytics are not used to identify individuals.']],
      ['Your choices and rights', ['You may request access, correction, or deletion of account-related data. You may also send a Global Privacy Control signal through your browser to express an opt-out from sale or sharing. Locusify does not sell personal data and will not reduce service because of that choice.']],
      ['Third-party links', ['External destinations such as GitHub and Buy Me a Coffee open only after you choose to follow a link. Their own privacy policies govern their processing. This site’s Referrer-Policy limits the source information sent across origins.']],
      ['Contact us', ['To exercise your rights or ask a privacy question, contact us through the Locusify GitHub repository Issues or Security Advisory. We may update this policy and will show the new effective date on this page.']],
    ],
  },
} as const

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const currentLocale = toSiteLocale(locale)
  const page = content[currentLocale]
  const pageUrl = absoluteUrl(currentLocale, '/privacy')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        'url': pageUrl,
        'name': page.title,
        'dateModified': '2026-07-31',
        'inLanguage': currentLocale === 'zh' ? 'zh-CN' : 'en-US',
        'isPartOf': { '@id': WEBSITE_ID },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': SITE_NAME, 'item': absoluteUrl(currentLocale) },
          { '@type': 'ListItem', 'position': 2, 'name': page.title, 'item': pageUrl },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <JsonLd data={jsonLd} />
      <Header mode="content" />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-12 md:pt-32 lg:px-20">
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-zinc-400">{page.effective}</p>
        <div className="mt-10 space-y-10">
          {page.sections.map(([heading, paragraphs]) => (
            <section key={heading}>
              <h2 className="text-xl font-medium text-zinc-100">{heading}</h2>
              <div className="mt-3 space-y-4 text-base leading-8 text-zinc-300">
                {paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
      <FooterSection variant="dark" />
    </main>
  )
}
