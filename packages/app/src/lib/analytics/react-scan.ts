import { env } from '@/lib/env'

/**
 * react-scan 现在只在显式开启时启动（`VITE_REACT_SCAN=1 pnpm dev`）。
 *
 * 之前它默认在 dev 常驻，带来两个副作用：
 *  1. 注入 `#react-scan-root` 覆盖层，拦截页面上所有点击 ——
 *     任何 `Locator.click()` 都会报 "intercepts pointer events"，
 *     测试必须额外注入 CSS 才能操作页面。
 *  2. 自身产生 console 告警（如 react-grab 版本过期），污染 console 门禁。
 *
 * 另外不再打印 "React Scan initialized"：所有持久化/诊断噪声都会
 * 让「console 零 error/warning」这条门禁失去意义。
 */
async function initialize() {
  if (!env.VITE_REACT_SCAN)
    return
  const { start } = await import('react-scan')
  start()
}

export default initialize
