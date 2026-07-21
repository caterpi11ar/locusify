import process from 'node:process'
import createNextIntlPlugin from 'next-intl/plugin'
import { z } from 'zod'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const { NEXT_PUBLIC_APP_URL } = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
}).parse(process.env)
const appOrigin = new URL(NEXT_PUBLIC_APP_URL).origin

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the validated value identical in server and browser bundles.
  env: {
    NEXT_PUBLIC_APP_URL,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-src 'self' ${appOrigin};`,
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
