import type { BlogPost } from '@/lib/blog'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getBlogPostBySlug } from '@/lib/blog'

const FEATURED_SLUGS = [
  'how-to-create-an-animated-travel-map',
  'how-to-export-travel-route-video-from-photos',
  'recover-missing-photo-locations-for-travel-map',
  'how-to-organize-travel-photos-by-location',
]

export async function FeaturedGuidesSection({ locale }: { locale: string }) {
  const t = await getTranslations('Blog')
  const currentLocale = locale === 'zh' ? 'zh' : 'en'
  const posts = FEATURED_SLUGS
    .map(slug => getBlogPostBySlug(slug))
    .filter((post): post is BlogPost => Boolean(post))

  return (
    <section className="bg-background px-6 py-20 md:px-12 md:py-28 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          {t('heading.subtitle')}
        </p>
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="max-w-2xl text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            {t('featured.title')}
          </h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-80"
          >
            {t('featured.cta')}
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('featured.description')}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {posts.map(post => (
            <article key={post.slug} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t(`categories.${post.category}`)}
              </p>
              <h3 className="mt-3 text-lg font-medium leading-snug text-foreground">
                {currentLocale === 'zh' ? post.title.zh : post.title.en}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {currentLocale === 'zh' ? post.summary.zh : post.summary.en}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-80"
              >
                {t('readMore')}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
