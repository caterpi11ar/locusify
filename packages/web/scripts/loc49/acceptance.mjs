import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { checkedScreenshot, contextOptions, presets } from './viewport.mjs'

const base = 'http://localhost:3149'
const out = new URL('../../../../output/playwright/', import.meta.url)
await fs.mkdir(out, { recursive: true })
const messages = await Promise.all(['zh', 'en'].map(async lang => JSON.parse(await fs.readFile(new URL(`../../messages/${lang}.json`, import.meta.url), 'utf8'))))
const productionCodes = messages.map(m => m.Hero.promotion.code)
const browser = await chromium.launch({ channel: 'msedge' })
const report = { engine: 'chromium', channel: 'msedge', version: browser.version(), playwright: '1.56.1', realDevices: 'unverified', safari: 'unverified', captures: [], checks: [] }
async function capture(page, options, id) {
  await page.evaluate(() => document.fonts.ready)
  const result = await checkedScreenshot(page, options, new URL(`${id}.png`, out).pathname.replace(/^\/([A-Z]:)/, '$1'))
  assert.equal(result.metrics.fullWidth, result.metrics.width, `${id}: horizontal overflow`)
  report.captures.push({ id, options, ...result })
}
async function contextFor(options, code) {
  const context = await browser.newContext({ ...options, locale: 'zh-CN' })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== base)
      return route.abort()
    if (route.request().resourceType() === 'document') {
      const response = await route.fetch()
      let body = await response.text()
      for (const value of productionCodes) body = body.replaceAll(value, code)
      return route.fulfill({ response, body })
    }
    return route.continue()
  })
  await context.addInitScript(() => {
    window.copyMode = 'success'
    window.copied = []
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => {
      window.copied.push(value)
      if (window.copyMode === 'error')
        throw new Error('synthetic denied')
      if (window.copyMode === 'pending')
        await new Promise((resolve) => { window.resolveCopy = resolve })
    } } })
  })
  return context
}
async function geometry(page) {
  const buttons = page.locator('[data-announcement-banner] button')
  const a = await buttons.nth(0).boundingBox()
  const b = await buttons.nth(1).boundingBox()
  assert(a && b)
  assert(a.width >= 88 && a.height >= 44 && b.width >= 44 && b.height >= 44)
  assert(a.x + a.width + 11 <= b.x || a.y + a.height <= b.y || b.y + b.height <= a.y, 'buttons overlap')
  for (const button of await buttons.all()) {
    await button.scrollIntoViewIfNeeded()
    assert(await button.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
    }), 'hit test failed')
  }
}
try {
  for (const name of Object.keys(presets)) {
    const options = contextOptions(name, 1)
    for (const lang of ['zh', 'en']) {
      for (const length of ['short', 'long']) {
        const code = length === 'short' ? 'DEMO-ONLY-1234' : `DEMO-ONLY-${'X'.repeat(128)}`
        const context = await contextFor(options, code)
        try {
          const page = await context.newPage()
          const home = lang === 'zh' ? '/' : '/en'
          const id = `${name}-${lang}-${length}`
          assert.equal((await page.goto(base + home)).status(), 200)
          const banner = page.locator('[data-announcement-banner]')
          const copy = banner.locator('button').nth(0)
          const close = banner.locator('button').nth(1)
          await page.waitForFunction(() => document.querySelector('[data-announcement-banner] code'))
          assert.equal(await banner.locator('code').textContent(), code)
          await geometry(page)
          await page.evaluate(() => scrollTo(0, 0))
          await capture(page, options, `${id}-open`)
          await copy.click()
          await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.length > 0)
          assert.deepEqual(await page.evaluate(() => window.copied), [code])
          assert(await banner.isVisible())
          await capture(page, options, `${id}-success`)
          await page.evaluate(() => {
            window.copyMode = 'error'
          })
          await copy.click()
          await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.includes('手动') || document.querySelector('[role=status]')?.textContent?.includes('manually'))
          await geometry(page)
          await capture(page, options, `${id}-error`)
          await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }))
          await copy.click()
          assert(await banner.locator('[role=status]').textContent())
          await close.focus()
          await close.press('Enter')
          assert.equal(await banner.count(), 0)
          assert(await page.locator('[data-home-link]').evaluate(el => el === document.activeElement))
          await page.evaluate(() => scrollTo(0, 0))
          await capture(page, options, `${id}-closed`)
          await page.reload()
          assert.equal(await banner.count(), 0)
          if (length === 'short') {
            const menu = page.locator('button[aria-label="Toggle menu"]')
            if (await menu.isVisible()) {
              await menu.click()
              await capture(page, options, `${id}-menu`)
              const last = page.locator('[data-site-header] nav').last().locator('a').last()
              await last.scrollIntoViewIfNeeded()
              assert(await last.isVisible())
            }
            const response = await page.goto(`${base + home.replace(/\/$/, '')}/missing`)
            assert.equal(response.status(), 404)
            assert.equal(await page.locator('h1').textContent(), lang === 'zh' ? '页面不存在' : 'Page not found')
            assert.equal(await page.locator('link[rel=canonical]').count(), 0)
            assert((await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'))
            await capture(page, options, `${id}-404`)
            assert.equal((await page.reload()).status(), 404)
            await page.locator('main a').click()
            await page.waitForURL(base + home)
          }
          report.checks.push({ id, status: 'passed', geometry: true, clipboardSuccess: true, clipboardRejection: true, clipboardUnavailable: true, focusRestored: true, sessionDismissal: true })
        }
        finally { await context.close() }
      }
    }
    console.log(`passed ${name}`)
  }
  report.status = 'passed'
}
catch (error) {
  report.status = 'failed'
  report.error = String(error)
  throw error
}
finally {
  await fs.writeFile(new URL('dimensions.json', out), JSON.stringify(report, null, 2))
  await browser.close()
}
