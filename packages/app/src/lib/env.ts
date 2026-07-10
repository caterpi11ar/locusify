import { z } from 'zod'

/** Environment variables schema */
const envSchema = z.object({
  /** Node.js environment mode */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Backend API base URL */
  VITE_API_BASE_URL: z.string().default('http://localhost:3000'),
  /** Debug: force Pro subscription status */
  VITE_DEBUG_PRO: z.coerce.boolean().default(false),
})

export type Env = z.infer<typeof envSchema>

/** Validate environment variables */
function validateEnv(): Env {
  try {
    const parsedEnv = envSchema.parse({
      NODE_ENV: import.meta.env.MODE,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_DEBUG_PRO: import.meta.env.DEV && import.meta.env.VITE_DEBUG_PRO,
    })

    return parsedEnv
  }
  catch (error) {
    console.error('❌ Environment validation failed:', error)
    throw new Error('Invalid environment variables')
  }
}

/** Export validated environment variables */
export const env = validateEnv()
