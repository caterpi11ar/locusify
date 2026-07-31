import type { Metadata } from 'next'
import type { BlogTopic } from '@/lib/blog'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { JsonLd } from '@/components/json-ld'
import { FooterSection } from '@/components/sections/footer-section'
import { Link } from '@/i18n/navigation'
import {

  getAllBlogTopics,
  getBlogPostsByTopic,
  getTopicLabel,
} from '@/lib/blog'
import { absoluteUrl, SITE_NAME, toSiteLocale, WEBSITE_ID } from '@/lib/site'

function isBlogTopic(value: string): value is BlogTopic {
  return getAllBlogTopics().includes(value as BlogTopic)
}

function getTopicUrl(locale: string, topic: string) {
  return absoluteUrl(toSiteLocale(locale), `/blog/topic/${topic}`)
}

export function generateStaticParams() {
  return getAllBlogTopics().map(topic => ({ topic }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string, topic: string }>
}): Promise<Metadata> {
  const { locale, topic } = await params
  if (!isBlogTopic(topic))
    return {}

  const currentLocale = locale === 'zh' ? 'zh' : 'en'
  const topicLabel = getTopicLabel(topic, currentLocale)
  const title
    = currentLocale === 'zh'
      ? `${topicLabel} 相关文章 | Locusify 博客`
      : `${topicLabel} Articles | Locusify Blog`
  const description
    = currentLocale === 'zh'
      ? `浏览 Locusify 精选的 ${topicLabel} 教程、工具对比与真实案例，了解 GPS 照片整理、旅行路线制作、动画导出和隐私保护的可执行方法。`
      : `Explore practical ${topicLabel.toLowerCase()} tutorials, tool comparisons, and examples for GPS photo organization, travel route creation, animation export, and privacy.`
  const canonical = getTopicUrl(locale, topic)

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'zh': absoluteUrl('zh', `/blog/topic/${topic}`),
        'en': absoluteUrl('en', `/blog/topic/${topic}`),
        'x-default': absoluteUrl('zh', `/blog/topic/${topic}`),
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

export default async function BlogTopicPage({
  params,
}: {
  params: Promise<{ locale: string, topic: string }>
}) {
  const { locale, topic } = await params
  setRequestLocale(locale)

  if (!isBlogTopic(topic)) {
    notFound()
  }

  const t = await getTranslations('Blog')
  const posts = getBlogPostsByTopic(topic)
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US'
  const topicLabel = getTopicLabel(topic, locale === 'zh' ? 'zh' : 'en')
  const currentLocale = toSiteLocale(locale)
  const topicUrl = absoluteUrl(currentLocale, `/blog/topic/${topic}`)
  const blogUrl = absoluteUrl(currentLocale, '/blog')
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${topicUrl}#collection`,
        'name': topicLabel,
        'url': topicUrl,
        'isPartOf': { '@id': WEBSITE_ID },
        'mainEntity': {
          '@type': 'ItemList',
          'itemListElement': posts.map((post, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'url': absoluteUrl(currentLocale, `/blog/${post.slug}`),
            'name': currentLocale === 'zh' ? post.title.zh : post.title.en,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${topicUrl}#breadcrumb`,
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': SITE_NAME, 'item': absoluteUrl(currentLocale) },
          { '@type': 'ListItem', 'position': 2, 'name': currentLocale === 'zh' ? '博客' : 'Blog', 'item': blogUrl },
          { '@type': 'ListItem', 'position': 3, 'name': topicLabel, 'item': topicUrl },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <JsonLd data={collectionJsonLd} />
      <Header mode="content" />
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-28 md:px-12 md:pt-32 lg:px-20">
        <Link href="/blog" className="text-sm text-zinc-400 underline underline-offset-4">
          {t('backToBlog')}
        </Link>
        <h1 className="mt-6 text-3xl font-medium tracking-tight md:text-4xl">
          {t('topic.heading', { topic: topicLabel })}
        </h1>
        <p className="mt-3 text-sm text-zinc-400">{t('topic.description')}</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {posts.map(post => (
            <article key={post.slug} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <time className="text-xs uppercase tracking-wide text-zinc-500">
                {new Intl.DateTimeFormat(dateLocale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(post.date))}
              </time>
              <h2 className="mt-3 text-lg font-medium leading-snug text-zinc-100">
                {locale === 'zh' ? post.title.zh : post.title.en}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {locale === 'zh' ? post.summary.zh : post.summary.en}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-3 inline-block text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white"
              >
                {t('readMore')}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <FooterSection variant="dark" />
    </main>
  )
}
