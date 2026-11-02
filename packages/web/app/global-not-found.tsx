import type { Metadata } from 'next'
import { NotFoundContent } from '@/components/not-found-content'
import './globals.css'

export const metadata: Metadata = {
  title: '页面不存在 · Locusify',
  robots: { index: false, follow: true },
}

export default function GlobalNotFound() {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased"><NotFoundContent /></body>
    </html>
  )
}
