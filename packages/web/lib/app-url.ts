import { env } from '@/lib/env'

/** App origin used by interactive links and the embedded preview. */
export const APP_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
