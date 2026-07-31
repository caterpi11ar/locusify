import { ImageResponse } from 'next/og'
import { getBlogPostBySlug } from '@/lib/blog'

export const alt = 'Locusify travel map blog article'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string, slug: string }>
}) {
  const { locale, slug } = await params
  const post = getBlogPostBySlug(slug)
  const title = post
    ? locale === 'zh' ? post.title.zh : post.title.en
    : 'Locusify Travel Map Blog'
  const eyebrow = locale === 'zh' ? 'GPS 照片地图 · 旅行路线教程' : 'GPS Photo Maps · Travel Route Guides'

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 58%, #1e3a8a 100%)',
          color: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '72px 80px',
          width: '100%',
        }}
      >
        <div style={{ color: '#a1a1aa', display: 'flex', fontSize: 28, letterSpacing: 1.5 }}>
          {eyebrow}
        </div>
        <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, lineHeight: 1.15, maxWidth: 1040 }}>
          {title}
        </div>
        <div style={{ alignItems: 'center', display: 'flex', fontSize: 30, fontWeight: 600 }}>
          Locusify
          <span style={{ color: '#60a5fa', marginLeft: 16 }}>locusify.cn</span>
        </div>
      </div>
    ),
    size,
  )
}
