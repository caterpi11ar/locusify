import assert from 'node:assert/strict'
import { PNG } from 'pngjs'

export const presets = Object.fromEntries([
  ...[[1366, 768], [1440, 900], [1920, 1080]].map(([width, height]) => [`pc-${width}`, { width, height, mobile: false }]),
  ...[['phone', 360, 800], ['phone', 390, 844], ['phone', 430, 932], ['tablet', 768, 1024], ['tablet', 820, 1180], ['tablet', 1024, 1366]].flatMap(([kind, width, height]) => [
    [`${kind}-${width}-portrait`, { width, height, mobile: true }],
    [`${kind}-${width}-landscape`, { width: height, height: width, mobile: true }],
  ]),
])

export function contextOptions(name = 'pc-1440', dpr = 1) {
  const preset = presets[name]
  assert(preset, `Unknown or pending preset: ${name}; iPhone Duo is pending user clarification`)
  assert(Number.isInteger(dpr) && dpr >= 1 && dpr <= 3, 'DPR must be explicitly set to 1, 2 or 3')
  const { width, height, mobile } = preset
  return { viewport: { width, height }, screen: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: 'reduce' }
}

export async function checkedScreenshot(page, options, path, { fullPage = false, scale = 'css' } = {}) {
  assert(['css', 'device'].includes(scale), 'Screenshot scale must be css or device')
  const metrics = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, screenWidth: screen.width, screenHeight: screen.height, visualScale: visualViewport.scale, fullWidth: Math.max(innerWidth, document.documentElement.scrollWidth, document.body.scrollWidth), fullHeight: Math.max(innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight) }))
  assert.equal(metrics.width, options.viewport.width, 'innerWidth mismatch')
  assert.equal(metrics.height, options.viewport.height, 'innerHeight mismatch')
  assert.equal(metrics.dpr, options.deviceScaleFactor, 'DPR mismatch')
  assert.equal(metrics.screenWidth, options.screen.width, 'screen.width mismatch')
  assert.equal(metrics.screenHeight, options.screen.height, 'screen.height mismatch')
  assert.equal(metrics.visualScale, 1, 'Browser/pinch scale must be 1')
  const factor = scale === 'css' ? 1 : metrics.dpr
  const expected = { width: (fullPage ? metrics.fullWidth : metrics.width) * factor, height: (fullPage ? metrics.fullHeight : metrics.height) * factor }
  const bytes = await page.screenshot({ path, fullPage, scale, animations: 'disabled', type: 'png' })
  const decoded = PNG.sync.read(bytes)
  assert.equal(decoded.width, expected.width, 'PNG width mismatch')
  assert.equal(decoded.height, expected.height, 'PNG height mismatch')
  return { metrics, fullPage, scale, expected, actual: { width: decoded.width, height: decoded.height } }
}
