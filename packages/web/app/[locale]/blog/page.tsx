import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Header } from '@/components/header'
import { JsonLd } from '@/components/json-ld'
import { BlogSection } from '@/components/sections/blog-section'
import { FooterSection } from '@/components/sections/footer-section'
import { getBlogPostModifiedDate, getSearchReadyBlogPosts } from '@/lib/blog'
import { absoluteUrl, ORGANIZATION_ID, rssUrl, SITE_NAME, toSiteLocale, WEBSITE_ID } from '@/lib/site'

function getBlogUrl(locale: string) {
  return absoluteUrl(toSiteLocale(locale), '/blog')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Blog.meta' })
  const canonical = getBlogUrl(locale)

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: {
        'zh': absoluteUrl('zh', '/blog'),
        'en': absoluteUrl('en', '/blog'),
        'x-default': absoluteUrl('zh', '/blog'),
      },
      types: {
        'application/rss+xml': rssUrl(toSiteLocale(locale)),
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: canonical,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: t('title') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og-image.png'],
    },
  }
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const currentLocale = toSiteLocale(locale)
  const posts = getSearchReadyBlogPosts()
  const blogUrl = absoluteUrl(currentLocale, '/blog')
  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${blogUrl}#blog`,
        'name': currentLocale === 'zh' ? 'Locusify 旅行地图博客' : 'Locusify Travel Map Blog',
        'url': blogUrl,
        'inLanguage': currentLocale === 'zh' ? 'zh-CN' : 'en-US',
        'isPartOf': { '@id': WEBSITE_ID },
        'publisher': { '@id': ORGANIZATION_ID },
        'blogPost': posts.slice(0, 12).map(post => ({
          '@type': 'BlogPosting',
          '@id': `${absoluteUrl(currentLocale, `/blog/${post.slug}`)}#article`,
          'headline': currentLocale === 'zh' ? post.title.zh : post.title.en,
          'url': absoluteUrl(currentLocale, `/blog/${post.slug}`),
          'datePublished': post.date,
          'dateModified': getBlogPostModifiedDate(post),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${blogUrl}#breadcrumb`,
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': SITE_NAME, 'item': absoluteUrl(currentLocale) },
          { '@type': 'ListItem', 'position': 2, 'name': currentLocale === 'zh' ? '博客' : 'Blog', 'item': blogUrl },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <JsonLd data={blogJsonLd} />
      <Header mode="content" />
      <div className="pt-20 md:pt-24">
        <BlogSection locale={locale} />
      </div>
      <FooterSection variant="dark" />
    </main>
  )
}
