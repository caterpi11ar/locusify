import { z } from 'zod'

/** Environment variables schema */
const envSchema = z.object({
  /** Node.js environment mode */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Backend API base URL */
  VITE_API_BASE_URL: z.string().url().transform(value => value.replace(/\/$/, '')).default('https://api.locusify.cn'),
  /** Debug: force Pro subscription status */
  VITE_DEBUG_PRO: z.coerce.boolean().default(false),
  /** 显式开启 react-scan（默认关：它会拦截点击并产生 console 告警） */
  VITE_REACT_SCAN: z.coerce.boolean().default(false),
})

export type Env = z.infer<typeof envSchema>

/** Validate environment variables */
function validateEnv(): Env {
  try {
    const parsedEnv = envSchema.parse({
      NODE_ENV: import.meta.env.MODE,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_DEBUG_PRO: import.meta.env.DEV && import.meta.env.VITE_DEBUG_PRO,
      VITE_REACT_SCAN: import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN,
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
