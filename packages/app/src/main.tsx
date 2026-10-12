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
  // 只在生产环境加载 GA。
  //
  // 除了「dev 不该发统计数据」之外，还有一个更硬的原因：这段代码在 React
  // 渲染期间往 document.head 插入 <script>，React 19 会因此报
  // 「Encountered a script tag while rendering React component」——
  // dev 下稳定一条 error，污染 console 门禁。
  if (!import.meta.env.PROD)
    return

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
