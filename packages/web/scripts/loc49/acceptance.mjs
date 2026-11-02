import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { checkedScreenshot, contextOptions, presets } from './viewport.mjs'

const base = 'http://localhost:3149'
const out = new URL('../../../../output/playwright/restored/', import.meta.url)
await fs.mkdir(out, { recursive: true })
const messages = await Promise.all(['zh', 'en'].map(async lang => JSON.parse(await fs.readFile(new URL(`../../messages/${lang}.json`, import.meta.url), 'utf8'))))
const code = 'DEMO-ONLY-1234'
const browser = await chromium.launch({ channel: 'msedge' })
const report = { engine: 'chromium', channel: 'msedge', version: browser.version(), playwright: '1.56.1', captures: [], checks: [] }
async function capture(page, options, id) {
  await page.evaluate(() => document.fonts.ready)
  const result = await checkedScreenshot(page, options, new URL(`${id}.png`, out).pathname.replace(/^\/([A-Z]:)/, '$1'))
  assert.equal(result.metrics.fullWidth, result.metrics.width)
  report.captures.push({ id, options, ...result })
}
try {
  for (const name of Object.keys(presets)) {
    const options = contextOptions(name)
    for (const [index, lang] of ['zh', 'en'].entries()) {
      const context = await browser.newContext({ ...options, locale: 'zh-CN' })
      try {
        await context.route('**/*', async (route) => {
          if (new URL(route.request().url()).origin !== base)
            return route.abort()
          if (route.request().resourceType() === 'document') {
            const response = await route.fetch()
            let body = await response.text()
            for (const message of messages)
              body = body.replaceAll(message.Hero.promotion.code, code)
            return route.fulfill({ response, body })
          }
          return route.continue()
        })
        await context.addInitScript(() => {
          window.copied = []
          Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value) => {
            window.copied.push(value)
          } } })
        })
        const page = await context.newPage()
        const home = lang === 'zh' ? '/' : '/en'
        await page.goto(base + home)
        const banner = page.locator('[data-announcement-banner]')
        const header = page.locator('[data-site-header]')
        const hidden = options.viewport.width < 1024
        assert.equal(await banner.isVisible(), !hidden)
        assert.equal((await header.boundingBox()).y, hidden ? 12 : 48)
        if (hidden) {
          assert(await banner.evaluate(el => getComputedStyle(el).display === 'none'))
          assert.equal(await banner.locator('button:visible').count(), 0)
        }
        else {
          const buttons = banner.locator('button')
          const a = await buttons.first().boundingBox()
          const b = await buttons.last().boundingBox()
          assert(a.x + a.width <= b.x || b.x + b.width <= a.x)
          await buttons.first().click()
          assert.deepEqual(await page.evaluate(() => window.copied), [code])
          assert(await banner.isVisible())
        }
        await capture(page, options, `${name}-${lang}-home`)
        if (!hidden) {
          await banner.locator('button').last().click()
          assert.equal(await banner.count(), 0)
          await page.waitForFunction(() => Math.abs(document.querySelector('[data-site-header]').getBoundingClientRect().top - 12) < 0.01)
          assert.equal((await header.boundingBox()).y, 12)
          await page.reload()
          assert.equal(await banner.count(), 0)
          await capture(page, options, `${name}-${lang}-dismissed`)
        }
        await page.goto(base + (lang === 'en' ? '/en/missing' : '/missing'))
        assert.equal(await page.locator('h1').textContent(), messages[index].NotFound.title)
        assert.equal(await page.locator('link[rel=canonical]').count(), 0)
        await capture(page, options, `${name}-${lang}-404`)
        report.checks.push({ name, lang, hidden, headerTop: hidden ? 12 : 48, status: 'passed' })
      }
      finally { await context.close() }
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
