import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { checkedScreenshot, contextOptions, presets } from './viewport.mjs'

const base = 'http://localhost:3149'
const out = new URL('../../../../output/playwright/', import.meta.url)
const browser = await chromium.launch({ channel: 'msedge' })
const report = { engine: 'chromium', channel: 'msedge', version: browser.version(), captures: [], routes: [], checks: [] }
async function capture(page, options, id) {
  await page.evaluate(() => document.fonts.ready)
  const r = await checkedScreenshot(page, options, new URL(`${id}.png`, out).pathname.replace(/^\/([A-Z]:)/, '$1'))
  assert.equal(r.metrics.fullWidth, r.metrics.width)
  report.captures.push({ id, options, ...r })
}
try {
  for (const [name] of Object.entries(presets)) {
    const options = contextOptions(name)
    const context = await browser.newContext({ ...options, locale: 'zh-CN' })
    await context.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort())
    try {
      const page = await context.newPage()
      for (const prefix of ['', '/en']) {
        for (const path of ['/blog', '/privacy']) {
          await page.goto(base + prefix + path)
          await capture(page, options, `${name}-${prefix ? 'en' : 'zh'}-${path.slice(1)}`)
          const header = page.locator('[data-site-header]')
          const items = header.locator('a:visible,button:visible')
          const boxes = await items.evaluateAll(es => es.map((e) => {
            const r = e.getBoundingClientRect()
            return { x: r.x, y: r.y, w: r.width, h: r.height }
          }))
          for (let i = 0;
            i < boxes.length;
            i++) {
            for (let j = i + 1;
              j < boxes.length;
              j++) {
              const a = boxes[i]
              const b = boxes[j]
              assert(a.x + a.w <= b.x + 1 || b.x + b.w <= a.x + 1 || a.y + a.h <= b.y + 1 || b.y + b.h <= a.y + 1, `header overlap ${name} ${path}`)
            }
          }
        }
      }
    }
    finally { await context.close() }
  }
  const context = await browser.newContext({ locale: 'zh-CN' })
  try {
    const page = await context.newPage()
    for (const path of ['/missing', '/en/missing', '/blog/absent', '/en/blog/absent', '/xx/missing', '/missing.txt', '/en/missing.txt', '/blog/topic/absent']) {
      await context.clearCookies()
      const r = await page.goto(base + path)
      assert.equal(r.status(), 404, path)
      assert.equal(await page.locator('link[rel=canonical]').count(), 0, path)
      assert((await page.title()).includes('Locusify'), path)
      assert((await page.locator('meta[name=robots]').first().getAttribute('content')).includes('noindex'))
      const h1 = await page.locator('h1').textContent()
      assert.equal(h1, path.startsWith('/en/') ? 'Page not found' : '页面不存在')
      assert.equal((await page.reload()).status(), 404)
      report.routes.push({ path, status: 404, title: await page.title(), h1, noindex: true, canonical: false })
    }
    const sitemap = await (await context.request.get(`${base}/sitemap.xml`)).text()
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1])
    for (const url of urls) {
      assert(url.startsWith('https://locusify.cn'))
      assert(!url.includes('?'))
      await context.clearCookies()
      const r = await page.goto(base + new URL(url).pathname)
      assert.equal(r.status(), 200, url)
      assert(await page.title(), url)
      assert(await page.locator('meta[name=description]').getAttribute('content'), url)
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), url)
      assert(await page.locator('meta[property="og:title"]').count())
      assert(await page.locator('meta[name="twitter:card"]').count())
    }
    report.checks.push({ sitemapUrls: urls.length, status: 'passed', title: true, description: true, canonical: true, sharing: true })
    assert((await (await context.request.get(`${base}/robots.txt`)).text()).includes('https://locusify.cn/sitemap.xml'))
  }
  finally { await context.close() }
  const opts = contextOptions('phone-390-portrait')
  const context2 = await browser.newContext({ ...opts, locale: 'zh-CN' })
  try {
    const codes = await Promise.all(['zh', 'en'].map(async l => JSON.parse(await fs.readFile(new URL(`../../messages/${l}.json`, import.meta.url), 'utf8')).Hero.promotion.code))
    await context2.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin !== base)
        return route.abort()
      if (route.request().resourceType() === 'document') {
        const r = await route.fetch()
        let body = await r.text()
        for (const c of codes)body = body.replaceAll(c, 'DEMO-ONLY-1234')
        return route.fulfill({ response: r, body })
      }
      return route.continue()
    })
    await context2.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() {
        throw new Error('synthetic storage denied')
      } })
      window.calls = 0
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => {
        window.calls++
        return new Promise((resolve) => {
          window.finishCopy = resolve
        })
      } } })
    })
    const page = await context2.newPage()
    await page.goto(`${base}/en`)
    const buttons = page.locator('[data-announcement-banner] button')
    await buttons.first().focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    assert.equal(await page.evaluate(() => window.calls), 1)
    assert.equal(await buttons.first().getAttribute('aria-disabled'), 'true')
    await page.keyboard.press('Tab')
    assert(await buttons.last().evaluate(el => el === document.activeElement))
    await page.keyboard.press('Space')
    assert.equal(await buttons.count(), 0)
    await page.evaluate(() => window.finishCopy())
    assert(await page.locator('[data-home-link]').evaluate(el => el === document.activeElement))
    await page.reload()
    assert.equal(await buttons.count(), 2)
    await buttons.first().click()
    await page.evaluate(() => window.finishCopy())
    for (const width of [639, 640]) {
      await page.setViewportSize({ width, height: 800 })
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
    await page.setViewportSize({ width: 844, height: 390 })
    assert.equal(await buttons.count(), 2)
    await buttons.last().click()
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await buttons.count(), 0)
    report.checks.push({ storageUnavailable: true, pendingDeduplicated: true, lateResolutionIgnored: true, keyboardEnterSpaceTab: true, breakpoints639640: true, text200percent: true, orientationState: true })
  }
  finally { await context2.close() }
  report.status = 'passed'
}
catch (e) {
  report.status = 'failed'
  report.error = String(e)
  throw e
}
finally {
  await fs.writeFile(new URL('extra.json', out), JSON.stringify(report, null, 2))
  await browser.close()
}
