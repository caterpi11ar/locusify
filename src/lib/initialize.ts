/** Initialize */
import initializeReactScan from '@/lib/analytics/react-scan'
import { initPlatform } from '@/platforms'
import { initializeAuth } from '@/stores/authStore'

/** Initialize all libraries */
async function initialize() {
  /** Initialize platform adapters (must be first) */
  await initPlatform()
  /** Initialize i18n */
  await import('@/i18n')
  /** Initialize React Scan */
  await initializeReactScan()
  /** Initialize Auth (non-blocking — UI shows loading via authReady state) */
  initializeAuth()
}

export default initialize
