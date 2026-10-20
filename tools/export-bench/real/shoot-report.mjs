import { Buffer } from 'node:buffer'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = resolve('../../../')
const REPORT = resolve(ROOT, 'reports/export-bench/report.html')
const OUT = resolve(ROOT, 'shots/report')
mkdirSync(OUT, { recursive: true })

/** Inline the figures so the shipped HTML is self-contained. */
function selfContained() {
  let html = readFileSync(REPORT, 'utf8')
  for (const m of html.matchAll(/src="([^"]+)"/g)) {
    const file = m[1]
    const p = resolve(dirname(REPORT), file)
    const b64 = readFileSync(p).toString('base64')
    html = html.replace(m[0], `src="data:image/png;base64,${b64}"`)
  }
  return html
}

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(pathToFileURL(REPORT).href, { waitUntil: 'load' })
await page.waitForTimeout(600)

// figure out where each section starts so we can slice the page
const tops = await page.evaluate(() => {
  const hs = [...document.querySelectorAll('h2')]
  return hs.map(h => Math.round(h.getBoundingClientRect().top + window.scrollY))
})
const height = await page.evaluate(() => document.body.scrollHeight)
console.log('sections', tops.length, 'height', height)

const bounds = [0, ...tops.slice(1), height]
const shots = []
for (let i = 0; i < bounds.length - 1; i++) {
  const y = bounds[i]
  const h = bounds[i + 1] - y
  const path = resolve(OUT, `report-real-${i + 1}.png`)
  await page.screenshot({ path, fullPage: true, clip: { x: 0, y, width: 1240, height: Math.max(1, h) } })
  shots.push(path)
  console.log('shot', path, h)
}

const standalone = resolve(OUT, 'locusify-export-bench-real.html')
writeFileSync(standalone, selfContained(), 'utf8')
console.log('standalone', standalone, Math.round(readFileSync(standalone).length / 1024), 'KB')

// also drop a single full-page shot for quick review
await page.screenshot({ path: resolve(OUT, 'report-real-full.png'), fullPage: true })
await browser.close()
void Buffer
