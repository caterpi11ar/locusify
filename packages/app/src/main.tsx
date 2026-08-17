import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@/components/ui/splash-screen'
/**
 * @description Import inconsolata font source
 * @description Supports weights 200-900
 */
import './index.css'

const root = createRoot(document.getElementById('root')!)
root.render(<SplashScreen />)

function scheduleAnalytics() {
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }

  const load = () => {
    window.gtag('js', new Date())
    window.gtag('config', 'G-MHD9DY05C4')
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-MHD9DY05C4'
    document.head.appendChild(script)
  }
  const idle = () => {
    const requestIdle = (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number }).requestIdleCallback
    if (requestIdle)
      requestIdle(load, { timeout: 3000 })
    else
      window.setTimeout(load, 1000)
  }
  if (document.readyState === 'complete')
    idle()
  else
    window.addEventListener('load', idle, { once: true })
}

scheduleAnalytics()

Promise.all([
  import('./lib/initialize'),
  import('./render-app'),
]).then(async ([{ default: initialize }, { renderApp }]) => {
  await initialize()
  renderApp(root)
}).catch((error) => {
  console.error('Failed to start Locusify:', error)
})
