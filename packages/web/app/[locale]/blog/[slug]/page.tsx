import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { JsonLd } from '@/components/json-ld'
import { FooterSection } from '@/components/sections/footer-section'
import { Link } from '@/i18n/navigation'
import {
  getBlogLongFormSections,
  getBlogPostBySlug,
  getBlogPostFaq,
  getBlogPostImage,
  getBlogPostModifiedDate,
  getEstimatedReadMinutes,
  getRelatedBlogPosts,
  getSearchReadyBlogPosts,
  isSearchReadyBlogPost,
} from '@/lib/blog'
import { absoluteUrl, ORGANIZATION_ID, PERSON_ID, SITE_NAME, toSiteLocale, WEBSITE_ID } from '@/lib/site'

function getBlogDetailUrl(locale: string, slug: string) {
  return absoluteUrl(toSiteLocale(locale), `/blog/${slug}`)
}

function getMetaDescription(post: NonNullable<ReturnType<typeof getBlogPostBySlug>>, locale: string) {
  const currentLocale = toSiteLocale(locale)
  const summary = currentLocale === 'zh' ? post.summary.zh : post.summary.en
  const paragraphs = currentLocale === 'zh' ? post.content.zh : post.content.en
  const combined = [summary, ...paragraphs].join(' ').replace(/\s+/g, ' ').trim()
  const maxLength = currentLocale === 'zh' ? 90 : 158

  if (combined.length <= maxLength)
    return combined

  const shortened = combined.slice(0, maxLength - 1)
  const lastBoundary = currentLocale === 'zh'
    ? Math.max(shortened.lastIndexOf('。'), shortened.lastIndexOf('；'))
    : shortened.lastIndexOf(' ')
  const safeCut = lastBoundary > maxLength * 0.75 ? shortened.slice(0, lastBoundary) : shortened
  return `${safeCut.trim()}…`
}

export function generateStaticParams() {
  return getSearchReadyBlogPosts().map(post => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string, slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post)
    return {}

  const title = locale === 'zh' ? post.title.zh : post.title.en
  const description = getMetaDescription(post, locale)
  const canonical = getBlogDetailUrl(locale, slug)
  const image = absoluteUrl(toSiteLocale(locale), `/blog/${slug}/opengraph-image`)
  const isIndexable = isSearchReadyBlogPost(post)
  const modifiedDate = getBlogPostModifiedDate(post)

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    keywords: locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en,
    authors: [{ name: 'caterpi11ar', url: 'https://github.com/caterpi11ar' }],
    creator: 'caterpi11ar',
    publisher: SITE_NAME,
    robots: isIndexable ? { index: true, follow: true } : { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        'zh': absoluteUrl('zh', `/blog/${slug}`),
        'en': absoluteUrl('en', `/blog/${slug}`),
        'x-default': absoluteUrl('zh', `/blog/${slug}`),
      },
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: modifiedDate,
      authors: [SITE_NAME],
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string, slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const post = getBlogPostBySlug(slug)
  const t = await getTranslations('Blog')

  if (!post) {
    notFound()
  }

  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US'
  const title = locale === 'zh' ? post.title.zh : post.title.en
  const summary = locale === 'zh' ? post.summary.zh : post.summary.en
  const content = locale === 'zh' ? post.content.zh : post.content.en
  const faqItems = getBlogPostFaq(post, locale === 'zh' ? 'zh' : 'en')
  const longFormSections = getBlogLongFormSections(post, locale === 'zh' ? 'zh' : 'en')
  const readMinutes = getEstimatedReadMinutes(post, locale === 'zh' ? 'zh' : 'en')
  const relatedPosts = getRelatedBlogPosts(post, 3)
  const articleUrl = getBlogDetailUrl(locale, post.slug)
  const image = getBlogPostImage(post)
  const modifiedDate = getBlogPostModifiedDate(post)
  const socialImage = absoluteUrl(toSiteLocale(locale), `/blog/${post.slug}/opengraph-image`)
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${articleUrl}#article`,
        'url': articleUrl,
        'headline': title,
        'description': summary,
        'datePublished': post.date,
        'dateModified': modifiedDate,
        'inLanguage': locale === 'zh' ? 'zh-CN' : 'en-US',
        'mainEntityOfPage': articleUrl,
        'isPartOf': { '@id': WEBSITE_ID },
        'image': socialImage,
        'keywords': locale === 'zh' ? post.targetKeywords.zh.join(', ') : post.targetKeywords.en.join(', '),
        'author': { '@id': PERSON_ID },
        'publisher': { '@id': ORGANIZATION_ID },
      },
      ...(faqItems.length > 0
        ? [{
            '@type': 'FAQPage',
            '@id': `${articleUrl}#faq`,
            'url': articleUrl,
            'isPartOf': { '@id': WEBSITE_ID },
            'mainEntity': faqItems.map(item => ({
              '@type': 'Question',
              'name': item.question,
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': item.answer,
              },
            })),
          }]
        : []),
      {
        '@type': 'BreadcrumbList',
        '@id': `${articleUrl}#breadcrumb`,
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': SITE_NAME, 'item': absoluteUrl(toSiteLocale(locale)) },
          { '@type': 'ListItem', 'position': 2, 'name': t('heading.subtitle'), 'item': absoluteUrl(toSiteLocale(locale), '/blog') },
          { '@type': 'ListItem', 'position': 3, 'name': title, 'item': articleUrl },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <JsonLd data={articleJsonLd} />
      <Header mode="content" />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-12 md:pt-32 lg:px-20">
        <Link href="/blog" className="text-sm text-zinc-400 underline underline-offset-4">
          {t('backToBlog')}
        </Link>
        <div className="mt-6 flex w-fit rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
          {t(`categories.${post.category}`)}
        </div>
        <div className="mt-3 flex w-fit rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
          {t(`intents.${post.intent}.title`)}
        </div>
        <h1 className="mt-5 text-3xl font-medium tracking-tight md:text-4xl">{title}</h1>
        <time className="mt-3 block text-sm text-zinc-400">
          {new Intl.DateTimeFormat(dateLocale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }).format(new Date(post.date))}
        </time>
        {modifiedDate !== post.date && (
          <p className="mt-1 text-sm text-zinc-500">
            {t('article.updated', {
              date: new Intl.DateTimeFormat(dateLocale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }).format(new Date(modifiedDate)),
            })}
          </p>
        )}
        <p className="mt-2 text-sm text-zinc-400">{t('article.readTime', { minutes: readMinutes })}</p>
        <p className="mt-6 text-zinc-300">{summary}</p>
        <Image
          src={image}
          alt={title}
          width={1200}
          height={630}
          priority
          className="mt-8 aspect-[1200/630] w-full rounded-2xl object-cover"
        />

        {longFormSections.length === 0 && (
          <div className="mt-10 space-y-4 text-base leading-8 text-zinc-300">
            {content.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </div>
        )}

        <section className="mt-12 space-y-12">
          {longFormSections.map(section => (
            <section key={section.heading} className="space-y-4">
              <h2 className="text-2xl font-medium tracking-tight text-zinc-100">{section.heading}</h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph} className="text-base leading-8 text-zinc-300">
                  {paragraph}
                </p>
              ))}
              {section.steps && (
                <ol className="space-y-3 pl-6 text-base leading-7 text-zinc-300 marker:font-medium marker:text-zinc-100">
                  {section.steps.map(step => <li key={step} className="pl-2">{step}</li>)}
                </ol>
              )}
            </section>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-medium text-zinc-100">{t('article.tryHeading')}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{locale === 'zh' ? post.cta.zh : post.cta.en}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white"
          >
            {t('article.cta')}
          </Link>
        </section>

        {faqItems.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-medium text-zinc-100">{t('article.faqHeading')}</h2>
            <div className="mt-4 space-y-4">
              {faqItems.map(item => (
                <article key={item.question} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-sm font-medium text-zinc-100">{item.question}</h3>
                  <p className="mt-2 text-sm text-zinc-300">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-medium text-zinc-100">{t('article.relatedHeading')}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {relatedPosts.map(relatedPost => (
              <article key={relatedPost.slug} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-sm font-medium leading-snug text-zinc-100">
                  {locale === 'zh' ? relatedPost.title.zh : relatedPost.title.en}
                </h3>
                <p className="mt-2 text-xs text-zinc-400">
                  {locale === 'zh' ? relatedPost.summary.zh : relatedPost.summary.en}
                </p>
                <Link
                  href={`/blog/${relatedPost.slug}`}
                  className="mt-3 inline-block text-xs font-medium text-zinc-200 underline underline-offset-4 hover:text-white"
                >
                  {t('readMore')}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </article>
      <FooterSection variant="dark" />
    </main>
  )
}
