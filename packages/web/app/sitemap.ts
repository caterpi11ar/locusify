import type { MetadataRoute } from 'next'
import { getAllBlogTopics, getBlogPostModifiedDate, getSearchReadyBlogPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL
  const posts = getSearchReadyBlogPosts()
  const topics = getAllBlogTopics()
  const latestPostDate = new Date(
    posts.reduce(
      (latest, post) => Math.max(latest, new Date(getBlogPostModifiedDate(post)).getTime()),
      new Date('2026-01-01').getTime(),
    ),
  )

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: latestPostDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: latestPostDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: latestPostDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en/blog`,
      lastModified: latestPostDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/en/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const lastModified = new Date(getBlogPostModifiedDate(post))
    return [
      {
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/en/blog/${post.slug}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
    ]
  })

  const topicRoutes: MetadataRoute.Sitemap = topics.flatMap(topic => [
    {
      url: `${baseUrl}/blog/topic/${topic}`,
      lastModified: latestPostDate,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/en/blog/topic/${topic}`,
      lastModified: latestPostDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ])

  return [...staticRoutes, ...postRoutes, ...topicRoutes]
}
