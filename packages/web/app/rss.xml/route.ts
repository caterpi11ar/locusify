import { generateRss } from '@/lib/rss'

export const dynamic = 'force-static'

export function GET() {
  return new Response(generateRss('zh'), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
