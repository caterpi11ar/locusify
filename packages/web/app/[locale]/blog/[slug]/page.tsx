import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import { Header } from '@/components/header'
import { FooterSection } from '@/components/sections/footer-section'
import { Link } from '@/i18n/navigation'
import {
  getAllBlogPosts,
  getBlogLongFormSections,
  getBlogPostBySlug,
  getBlogPostFaq,
  getEstimatedReadMinutes,
  getRelatedBlogPosts,
} from '@/lib/blog'

const BASE_URL = 'https://app.locusify.cn'

function getBlogDetailUrl(locale: string, slug: string) {
  return locale === 'zh' ? `${BASE_URL}/blog/${slug}` : `${BASE_URL}/en/blog/${slug}`
}

export function generateStaticParams() {
  return getAllBlogPosts().map(post => ({ slug: post.slug }))
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
  const description = locale === 'zh' ? post.summary.zh : post.summary.en
  const canonical = getBlogDetailUrl(locale, slug)

  return {
    title: `${title} | Locusify Blog`,
    description,
    keywords: locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en,
    alternates: {
      canonical,
      languages: {
        'zh': `${BASE_URL}/blog/${slug}`,
        'en': `${BASE_URL}/en/blog/${slug}`,
        'x-default': `${BASE_URL}/blog/${slug}`,
      },
    },
    openGraph: {
      title: `${title} | Locusify Blog`,
      description,
      url: canonical,
      type: 'article',
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
  const problem = summary
  const pain = content[0] ?? summary
  const solution = content.slice(1, 4)
  const example = content.slice(4)
  const articleUrl = locale === 'zh' ? `${BASE_URL}/blog/${post.slug}` : `${BASE_URL}/en/blog/${post.slug}`
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': title,
    'description': summary,
    'datePublished': post.date,
    'dateModified': post.date,
    'inLanguage': locale === 'zh' ? 'zh-CN' : 'en-US',
    'mainEntityOfPage': articleUrl,
    'keywords': locale === 'zh' ? post.targetKeywords.zh.join(', ') : post.targetKeywords.en.join(', '),
    'author': {
      '@type': 'Organization',
      'name': 'Locusify',
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Locusify',
    },
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqItems.map(item => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer,
      },
    })),
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <Script
        id={`blog-posting-jsonld-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id={`blog-faq-jsonld-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
        <p className="mt-2 text-sm text-zinc-400">{t('article.readTime', { minutes: readMinutes })}</p>
        <p className="mt-6 text-zinc-300">{summary}</p>

        <div className="mt-10 space-y-7 text-zinc-300">
          <section>
            <h2 className="text-xl font-medium text-zinc-100">{t('article.sections.problem')}</h2>
            <p className="mt-3">{problem}</p>
          </section>
          <section>
            <h2 className="text-xl font-medium text-zinc-100">{t('article.sections.pain')}</h2>
            <p className="mt-3">{pain}</p>
          </section>
          <section>
            <h2 className="text-xl font-medium text-zinc-100">{t('article.sections.solution')}</h2>
            <div className="mt-3 space-y-3">
              {solution.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-medium text-zinc-100">{t('article.sections.example')}</h2>
            <div className="mt-3 space-y-3">
              {(example.length > 0 ? example : content.slice(0, 2)).map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-10 space-y-8">
          {longFormSections.map(section => (
            <article key={section.heading} className="space-y-3">
              <h2 className="text-xl font-medium text-zinc-100">{section.heading}</h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph} className="text-zinc-300">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-medium text-zinc-100">{t('article.keywordHeading')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en).map(keyword => (
              <span
                key={keyword}
                className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-300">{locale === 'zh' ? post.cta.zh : post.cta.en}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white"
          >
            {t('article.cta')}
          </Link>
        </section>

        <section className="mt-10">
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
