import initializeReactScan from '@/lib/analytics/react-scan'
import { initializeAuth } from '@/stores/authStore'

async function initialize() {
  await import('@/i18n')
  void initializeReactScan()
  void initializeAuth()
  if (import.meta.env.DEV) {
    // 动态 import，保证测试入口不进生产包
    const { installTestBridge } = await import('@/lib/dev/testBridge')
    installTestBridge()
  }
}

export default initialize
