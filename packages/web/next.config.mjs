import process from 'node:process'
import createNextIntlPlugin from 'next-intl/plugin'
import { z } from 'zod'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const DEFAULT_APP_URL = 'https://app.locusify.cn'
const DEFAULT_SITE_URL = 'https://locusify.cn'
const { NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL } = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default(DEFAULT_APP_URL),
  NEXT_PUBLIC_SITE_URL: z.url().default(DEFAULT_SITE_URL),
}).parse(process.env)
const appOrigin = new URL(NEXT_PUBLIC_APP_URL).origin
const siteOrigin = new URL(NEXT_PUBLIC_SITE_URL).origin

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the validated value identical in server and browser bundles.
  env: {
    NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.locusify.cn' }],
        destination: `${siteOrigin}/:path*`,
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-src 'self' ${appOrigin}; frame-ancestors 'self';`,
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ${appOrigin} https://vitals.vercel-insights.com; frame-src 'self' ${appOrigin}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';`,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
