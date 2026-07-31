import type { SiteLocale } from '@/lib/site'
import { getBlogPostBySlug, getSearchReadyBlogPosts } from '@/lib/blog'
import { absoluteUrl, rssUrl, SITE_NAME } from '@/lib/site'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

export function generateRss(locale: SiteLocale) {
  const language = locale === 'zh' ? 'zh-CN' : 'en-US'
  const title = locale === 'zh' ? 'Locusify 旅行地图博客' : 'Locusify Travel Map Blog'
  const description = locale === 'zh'
    ? 'GPS 照片地图、旅行路线动画、隐私与工具对比的实用教程。'
    : 'Practical guides to GPS photo maps, animated travel routes, privacy, and travel map tools.'
  const items = getSearchReadyBlogPosts()
    .slice(0, 30)
    .map((post) => {
      const canonicalPost = getBlogPostBySlug(post.slug) ?? post
      const postTitle = locale === 'zh' ? canonicalPost.title.zh : canonicalPost.title.en
      const summary = locale === 'zh' ? canonicalPost.summary.zh : canonicalPost.summary.en
      const url = absoluteUrl(locale, `/blog/${canonicalPost.slug}`)

      return `
    <item>
      <title>${escapeXml(postTitle)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(summary)}</description>
      <pubDate>${new Date(`${canonicalPost.date}T00:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${SITE_NAME}</dc:creator>
    </item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(absoluteUrl(locale, '/blog'))}</link>
    <description>${escapeXml(description)}</description>
    <language>${language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(rssUrl(locale))}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`
}
