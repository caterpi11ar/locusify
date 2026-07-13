import type { MetadataRoute } from 'next'
import { getAllBlogPosts, getAllBlogTopics } from '@/lib/blog'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://app.locusify.cn'
  const now = new Date()
  const posts = getAllBlogPosts()
  const topics = getAllBlogTopics()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          zh: `${baseUrl}`,
          en: `${baseUrl}/en`,
        },
      },
    },
    {
      url: `${baseUrl}/en`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          zh: `${baseUrl}`,
          en: `${baseUrl}/en`,
        },
      },
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          zh: `${baseUrl}/blog`,
          en: `${baseUrl}/en/blog`,
        },
      },
    },
    {
      url: `${baseUrl}/en/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          zh: `${baseUrl}/blog`,
          en: `${baseUrl}/en/blog`,
        },
      },
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const lastModified = new Date(post.date)
    return [
      {
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: {
          languages: {
            zh: `${baseUrl}/blog/${post.slug}`,
            en: `${baseUrl}/en/blog/${post.slug}`,
          },
        },
      },
      {
        url: `${baseUrl}/en/blog/${post.slug}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: {
            zh: `${baseUrl}/blog/${post.slug}`,
            en: `${baseUrl}/en/blog/${post.slug}`,
          },
        },
      },
    ]
  })

  const topicRoutes: MetadataRoute.Sitemap = topics.flatMap(topic => [
    {
      url: `${baseUrl}/blog/topic/${topic}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
      alternates: {
        languages: {
          zh: `${baseUrl}/blog/topic/${topic}`,
          en: `${baseUrl}/en/blog/topic/${topic}`,
        },
      },
    },
    {
      url: `${baseUrl}/en/blog/topic/${topic}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          zh: `${baseUrl}/blog/topic/${topic}`,
          en: `${baseUrl}/en/blog/topic/${topic}`,
        },
      },
    },
  ])

  return [...staticRoutes, ...postRoutes, ...topicRoutes]
}
