import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url().default('https://locusify.cn'),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/).default('G-MHD9DY05C4'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    return envSchema.parse({
      // Next.js only inlines public variables when they are accessed directly.
      // Importing `process` from node:process prevents client-side replacement.
      // eslint-disable-next-line node/prefer-global/process
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      // eslint-disable-next-line node/prefer-global/process
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      // eslint-disable-next-line node/prefer-global/process
      NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    })
  }
  catch (error) {
    console.error('❌ Web environment validation failed:', error)
    throw new Error('Invalid web environment variables')
  }
}

export const env = validateEnv()
