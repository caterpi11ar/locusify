import initializeReactScan from '@/lib/analytics/react-scan'
import { initializeAuth } from '@/stores/authStore'

async function initialize() {
  await import('@/i18n')
  await initializeReactScan()
  initializeAuth()
}

export default initialize
