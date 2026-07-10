import { env } from '@/lib/env'

/** Start react-scan in development mode */
async function initialize() {
  if (env.NODE_ENV === 'development') {
    const { start } = await import('react-scan')
    start()
  }

  console.log('React Scan initialized')
}

export default initialize
