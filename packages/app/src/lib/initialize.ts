import initializeReactScan from '@/lib/analytics/react-scan'
import { initializeAuth } from '@/stores/authStore'

async function initialize() {
  await import('@/i18n')
  void initializeReactScan()
  void initializeAuth()
}

export default initialize
