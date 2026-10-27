import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

// Pass a local copy of locusify-viewport v1.0.0 after its locked npm ci.
const skill = resolve(process.argv[2])
const { chromium } = await import(pathToFileURL(resolve(skill, 'node_modules/playwright/index.mjs')))
const { contextOptions, checkedScreenshot } = await import(pathToFileURL(resolve(skill, 'scripts/viewport.mjs')))
const output = resolve('output/playwright/loc33-v4')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const report = { skill: 'locusify-viewport@1.0.0', channel: 'chrome', version: browser.version(), scenarios: [] }
try {
  for (const preset of ['pc-1440', 'phone-360-portrait', 'phone-390-portrait', 'phone-430-portrait', 'phone-390-landscape', 'tablet-768-portrait']) {
    const options = contextOptions(preset, preset === 'phone-390-portrait' ? 2 : 1)
    const context = await browser.newContext(options)
    try {
      const page = await context.newPage()
      const requests = []
      await page.route('**/api/v1/**', async (route) => {
        const url = route.request().url()
        let data = null
        if (url.endsWith('/auth/me'))
          data = { id: 'layout-only', email: 'layout@example.test' }
        if (url.endsWith('/profile'))
          data = { id: 'layout-only', display_name: 'Layout', provider: 'email' }
        if (url.endsWith('/discovery-source')) {
          data = { eligible: true, status: 'pending', source: null }
          if (route.request().method() === 'PUT') {
            requests.push(route.request().postDataJSON())
            data.status = 'skipped'
          }
        }
        await route.fulfill({ json: { success: true, data } })
      })
      await page.addInitScript(() => {
        const token = `e30.${btoa(JSON.stringify({ sub: 'layout-only' }))}.test`
        localStorage.setItem('locusify-tokens', JSON.stringify({ state: { accessToken: token, refreshToken: 'test-only' }, version: 1 }))
      })
      await page.goto(`${process.argv[3] ?? 'http://127.0.0.1:1053'}/zh-CN/`)
      const dialog = page.getByRole('dialog')
      await dialog.waitFor()
      await page.evaluate(() => document.fonts.ready)
      let mapReady = false
      if (preset === 'pc-1440' || preset === 'phone-390-portrait') {
        await page.evaluate(async () => {
          window.surveyPreviewMapStore = (await import('/src/stores/mapStore.ts')).useMapStore
        })
        mapReady = await page.waitForFunction(() => {
          const map = window.surveyPreviewMapStore.getState().mapInstance
          return !!map && map.loaded() && map.areTilesLoaded() && map.queryRenderedFeatures().length > 0
        }, undefined, { timeout: 20000 }).then(() => true, () => false)
        assert(mapReady, 'Map imagery must finish loading before acceptance screenshots')
        console.log(`${preset} underlying map ready: ${mapReady}`)
        if (mapReady) {
          await page.waitForFunction(() => {
            let element = document.querySelector('canvas')
            if (!element)
              return false
            while (element) {
              if (Number(getComputedStyle(element).opacity) < 0.99)
                return false
              element = element.parentElement
            }
            return true
          })
        }
      }
      const submit = page.getByRole('button', { name: '提交', exact: true })
      assert(await submit.isDisabled())
      assert.equal(await page.getByRole('radio').count(), 16)
      const icons = await dialog.locator('label i').evaluateAll(elements => elements.map(e => getComputedStyle(e).maskImage))
      assert.equal(icons.length, 16)
      assert(icons.every(mask => mask !== 'none'), 'Every channel must have a rendered local icon')
      const box = await dialog.boundingBox()
      const limit = options.viewport.width < 640 ? Math.min(options.viewport.height * 0.68, 560) : Math.min(options.viewport.height * 0.85, 720)
      assert(box.height <= limit + 1, 'Dialog height exceeds declared cap')
      assert(box.x >= 0 && box.x + box.width <= options.viewport.width)
      const scroll = page.getByTestId('discovery-options-scroll')
      const scrollMetrics = await scroll.evaluate(el => ({ clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }))
      if (preset === 'phone-390-portrait')
        await checkedScreenshot(page, options, resolve(output, 'phone-390-initial.png'))
      await page.getByRole('radio', { name: 'B站', exact: true }).check()
      await page.keyboard.press('ArrowRight')
      assert(await page.getByRole('radio', { name: '抖音', exact: true }).isChecked())
      assert(await submit.isEnabled())
      const capture = await checkedScreenshot(page, options, resolve(output, `${preset}.png`))
      const fullScreenLayers = await page.evaluate(() => [...document.body.children].filter((element) => {
        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()
        return style.position === 'fixed' && box.width >= innerWidth && box.height >= innerHeight
      }).length)
      assert.equal(fullScreenLayers, 0, 'Survey must not add a full-screen backdrop')
      assert.equal(await page.getByText('最新公告', { exact: true }).count(), 0, 'Announcement must wait behind survey')
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })
      const footer = await submit.boundingBox()
      assert(footer.y >= box.y && footer.y + footer.height <= box.y + box.height)
      await page.getByRole('radio', { name: '其他', exact: true }).check()
      assert(await page.getByRole('radio', { name: '其他', exact: true }).isChecked())
      if (preset === 'phone-390-portrait') {
        await checkedScreenshot(page, options, resolve(output, 'phone-390-bottom.png'))
        await assert.rejects(checkedScreenshot(page, { ...options, viewport: { ...options.viewport, width: 391 } }, resolve(output, 'must-not-exist.png')), /innerWidth mismatch/)
      }
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      await page.getByText('最新公告', { exact: true }).waitFor({ state: 'visible' })
      assert.deepEqual(requests, [{ status: 'skipped' }])
      report.scenarios.push({ preset, options, dialog: box, scroll: scrollMetrics, icons: icons.length, capture, fullScreenLayers, mapReady, passed: true })
    }
    finally {
      await context.close()
    }
  }
  report.negativeViewportRejected = true
  await writeFile(resolve(output, 'dimensions.json'), JSON.stringify(report, null, 2))
  console.log(`PASS: ${report.scenarios.length} fixed viewport scenarios; dimension negative case rejected`)
}
finally {
  await browser.close()
}
