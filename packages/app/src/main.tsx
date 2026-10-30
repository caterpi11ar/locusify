import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@/components/ui/splash-screen'
/**
 * @description Import inconsolata font source
 * @description Supports weights 200-900
 */
import './index.css'

const root = createRoot(document.getElementById('root')!)
root.render(<SplashScreen />)

// No third-party analytics in the local-photo application.

Promise.all([
  import('./lib/initialize'),
  import('./render-app'),
]).then(async ([{ default: initialize }, { renderApp }]) => {
  await initialize()
  renderApp(root)
}).catch((error) => {
  console.error('Failed to start Locusify:', error)
})
