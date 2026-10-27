import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const skill = resolve(process.argv[2])
const { chromium } = await import(pathToFileURL(resolve(skill, 'node_modules/playwright/index.mjs')))
const { contextOptions, checkedScreenshot } = await import(pathToFileURL(resolve(skill, 'scripts/viewport.mjs')))
const output = resolve('output/playwright/loc33-completion')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const report = []
try {
  for (const preset of ['pc-1440', 'phone-390-portrait']) {
    const options = contextOptions(preset)
    const context = await browser.newContext(options)
    try {
      const page = await context.newPage()
      let fail = true
      await page.route('**/api/v1/discovery-source', async (route) => {
        if (route.request().method() === 'PUT' && fail) {
          await route.fulfill({ status: 500, json: { success: false } })
          return
        }
        const source = route.request().method() === 'PUT' ? route.request().postDataJSON().source : null
        await route.fulfill({ json: { success: true, data: { eligible: true, status: source ? 'submitted' : 'pending', source } } })
      })
      await page.goto('http://127.0.0.1:11833/zh-CN/')
      await page.getByRole('dialog').waitFor()
      assert.equal(await page.locator('#loc33-preview-toolbar').count(), 0)
      await page.evaluate(async () => {
        window.surveyPreviewMapStore = (await import('/src/stores/mapStore.ts')).useMapStore
      })
      await page.waitForFunction(() => {
        const map = window.surveyPreviewMapStore.getState().mapInstance
        return map && map.loaded() && map.areTilesLoaded() && map.queryRenderedFeatures().length > 0
      })
      await page.getByRole('radio', { name: 'B站', exact: true }).check()
      await page.getByRole('button', { name: '提交', exact: true }).click()
      await page.getByRole('alert').waitFor()
      assert.equal(await page.getByText('感谢反馈！', { exact: true }).count(), 0)
      fail = false
      await page.getByRole('button', { name: '提交', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      await page.getByText('感谢反馈！', { exact: true }).waitFor()
      assert.equal(await page.getByText('感谢反馈！', { exact: true }).count(), 1)
      const toast = page.getByRole('status').filter({ hasText: '感谢反馈！' })
      const bounds = await toast.boundingBox()
      assert(bounds.x >= 0 && bounds.x + bounds.width <= options.viewport.width)
      const capture = await checkedScreenshot(page, options, resolve(output, `${preset}.png`))
      if (preset === 'pc-1440')
        await page.getByRole('button', { name: '完成', exact: true }).click()
      await page.getByText('感谢反馈！', { exact: true }).waitFor({ state: 'hidden', timeout: 9000 })
      await page.reload()
      assert.equal(await page.getByText('感谢反馈！', { exact: true }).count(), 0)
      report.push({ preset, capture, bounds, manualClose: preset === 'pc-1440', passed: true })
    }
    finally {
      await context.close()
    }
  }
  await writeFile(resolve(output, 'dimensions.json'), JSON.stringify(report, null, 2))
  console.log('PASS: no preview toolbar, no false success, thank-you card, manual/automatic dismissal, refresh')
}
finally {
  await browser.close()
}
