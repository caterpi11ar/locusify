import type { SearchIntent } from '@/lib/blog'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllBlogTopics, getSearchReadyBlogPosts, getTopicLabel } from '@/lib/blog'

const INTENT_ORDER: SearchIntent[] = ['top', 'middle', 'bottom']

export async function BlogSection({ locale }: { locale: string }) {
  const t = await getTranslations('Blog')
  const posts = getSearchReadyBlogPosts()
  const topics = getAllBlogTopics()
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US'

  return (
    <section className="bg-zinc-950 px-6 py-20 md:px-12 md:py-28 lg:px-20 lg:py-36">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wider text-zinc-400">
          {t('heading.subtitle')}
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight text-zinc-100 md:text-4xl lg:text-5xl">
          {t('heading.title')}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">
          {t('heading.description')}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {topics.map(topic => (
            <Link
              key={topic}
              href={`/blog/topic/${topic}`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              {getTopicLabel(topic, locale === 'zh' ? 'zh' : 'en')}
            </Link>
          ))}
        </div>

        <div className="mt-12 space-y-12">
          {INTENT_ORDER.map((intent) => {
            const intentPosts = posts.filter(post => post.intent === intent)
            if (intentPosts.length === 0)
              return null

            return (
              <div key={intent}>
                <h2 className="text-2xl font-medium tracking-tight text-zinc-100">
                  {t(`intents.${intent}.title`)}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">{t(`intents.${intent}.description`)}</p>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {intentPosts.map(post => (
                    <article key={post.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                      <time className="text-xs uppercase tracking-wide text-zinc-500">
                        {new Intl.DateTimeFormat(dateLocale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }).format(new Date(post.date))}
                      </time>
                      <h3 className="mt-3 text-lg font-medium leading-snug text-zinc-100">
                        {locale === 'zh' ? post.title.zh : post.title.en}
                      </h3>
                      <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                        {t(`categories.${post.category}`)}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                        {locale === 'zh' ? post.summary.zh : post.summary.en}
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="mt-4 inline-block text-sm font-medium text-zinc-200 underline underline-offset-4 hover:text-white"
                      >
                        {t('readMore')}
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
