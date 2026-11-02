import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|images/|videos/|\\.well-known/|(?:apple-icon\\.png|favicon-16\\.png|favicon-48\\.png|icon-light-32x32\\.png|logo\\.png|og-image\\.png|placeholder-logo\\.svg|placeholder\\.svg|llms\\.txt|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|rss\\.xml|en/rss\\.xml)$).*)',
    '/blog/:path*',
    '/en/blog/:path*',
  ],
}
