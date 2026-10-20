/**
 * Shared Playwright flow: boot the REAL Locusify app, sign in through its own
 * dev test bridge, upload the repo's GPS fixtures through the real upload
 * drawer, create a route, enter trajectory replay, and freeze playback at a
 * deterministic state with `recordingActive` on (i.e. the exact look the app
 * exports).
 *
 * Nothing here mocks the UI: the only mocks are the three auth/profile API
 * responses the E2E suite also mocks. Everything rendered is real app code.
 */
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

export const FIXTURES = ['01-tiananmen.jpg', '02-gulou.jpg', '03-olympic.jpg', '04-mutianyu.jpg']
  .map(f => resolve('../../../packages/app/e2e/fixtures', f))

const API_MOCKS = {
  '/auth/me': { id: 'e2e-user-0001', email: 'e2e@locusify.dev', created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-05-01T00:00:00Z' },
  '/profile': { id: 'e2e-user-0001', display_name: 'E2E Tester', avatar_url: null, provider: 'email' },
  '/subscriptions': { plan: 'free', status: 'active', is_pro: false },
}

export async function bootApp({ base, width = 1920, height = 1080, log = console.log } = {}) {
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'zh-CN' })
  const page = await ctx.newPage()
  page.on('pageerror', e => log('[pageerror]', String(e).slice(0, 200)))
  await page.route('**/api/v1/**', (route) => {
    const url = route.request().url().split('?')[0]
    for (const [path, data] of Object.entries(API_MOCKS)) {
      if (url.endsWith(path))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) })
  })

  await page.goto(`${base}/zh-CN/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => !!window.__locusify, null, { timeout: 60000 })
  await page.evaluate(() => {
    window.__locusify.dismissOverlays()
    window.__locusify.signIn()
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { state: 'attached', timeout: 90000 })
  await page.waitForTimeout(5000)
  return { browser, ctx, page }
}

/** Real upload drawer → real EXIF parse → real route creation. */
export async function createRoute(page, log = console.log) {
  await page.locator('button[aria-label="上传照片"]:visible').click()
  await page.waitForSelector('[data-testid="photo-file-input"]', { state: 'attached', timeout: 30000 })
  await page.setInputFiles('[data-testid="photo-file-input"]', FIXTURES)
  await page.waitForSelector('[data-testid="route-create"]', { timeout: 60000 })
  await page.click('[data-testid="route-create"]')
  await page.waitForSelector('.maplibregl-marker', { timeout: 60000 })
  await page.waitForTimeout(2500)
  const markers = await page.locator('.maplibregl-marker').count()
  log(`markers on map: ${markers}`)
  return markers
}

/** Click the sidebar's 轨迹 entry — real `prepareReplay` → `configuring`. */
export async function enterReplay(page) {
  await page.locator('button[aria-label="查看轨迹"]:visible').click()
  await page.waitForTimeout(1200)
  return page.evaluate(async () => {
    const { useReplayStore } = await import('/src/stores/replayStore.ts')
    const s = useReplayStore.getState()
    return { status: s.status, waypoints: s.waypoints.length, segments: s.segments.length }
  })
}

/**
 * Freeze the real replay clock at (segmentIndex, progress) with the recording
 * chrome on. `_tick` is replaced by a no-op so the rAF loop keeps running (the
 * store stays `playing`, no pause overlay) but time does not advance — every
 * capture is therefore deterministic.
 */
export async function freezeAt(page, segmentIndex, progress) {
  return page.evaluate(async ({ segmentIndex, progress }) => {
    const { useReplayStore } = await import('/src/stores/replayStore.ts')
    const { computePosition } = await import('/src/stores/replay/utils.ts')
    const s = useReplayStore.getState()
    useReplayStore.setState({ recordingActive: true, _tick: () => {} })
    if (s.status === 'configuring')
      s.confirmConfig()
    const seg = useReplayStore.getState().segments
    const n = Math.max(0, Math.min(segmentIndex, seg.length - 1))
    const pos = computePosition(s.waypoints, n, progress, seg)
    const total = (n + progress) / Math.max(1, seg.length)
    useReplayStore.setState({
      status: 'playing',
      currentWaypointIndex: n,
      segmentProgress: progress,
      totalProgress: total,
      currentPosition: pos,
      dwellRemaining: 0,
    })
    return { waypoints: s.waypoints.length, segments: seg.length, segment: n, progress, pos }
  }, { segmentIndex, progress })
}

export const CAPTURE_BOX_JS = `(() => {
  const el = [...document.querySelectorAll('div')].find(d => (d.style?.width ?? '').startsWith('min(100%'))
  return el ?? null
})()`
