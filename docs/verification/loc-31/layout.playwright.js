// playwright-cli run-code evaluates this function expression.
// eslint-disable-next-line no-unused-expressions
async (page) => {
  const rows = []
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 390, 638, 639, 640, 1280, 640, 639, 638, 640, 639]) {
      await page.setViewportSize({ width, height: 844 })
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)
      await page.waitForTimeout(350)
      const row = await page.evaluate(({ theme, width }) => {
        const modal = document.querySelector('.ant-modal')
        const icon = modal.querySelector('.i-mingcute-route-line')
        const box = icon.parentElement
        const left = box.parentElement
        const card = modal.querySelector('.bg-gradient-to-br.w-full')
        const buttons = left.lastElementChild
        const rect = (el) => {
          const r = el.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
        }
        const desktop = matchMedia('(min-width: 40rem)').matches
        const result = { theme, requestedWidth: width, cssWidth: document.documentElement.getBoundingClientRect().width, innerWidth, dpr: devicePixelRatio, visualScale: visualViewport.scale, cssZoom: getComputedStyle(document.documentElement).zoom, oldMax639: matchMedia('(max-width: 639px)').matches, min640: matchMedia('(min-width: 640px)').matches, desktop, box: rect(box), icon: rect(icon), card: rect(card), buttons: rect(buttons), left: rect(left), count: modal.querySelectorAll('.bg-gradient-to-br.w-full').length, overflow: document.documentElement.scrollWidth > innerWidth }
        result.pass = result.count === 1 && !result.overflow && Math.abs(result.box.width - 48) < 0.1 && Math.abs(result.icon.width - 22) < 0.1 && (desktop ? Math.abs(result.box.y - result.card.y) < 0.1 && Math.abs(result.buttons.bottom - result.card.bottom) < 0.1 : result.card.bottom < result.buttons.y && Math.abs(result.card.width - result.left.width) < 0.1)
        return result
      }, { theme, width })
      rows.push(row)
      await page.screenshot({ path: `output/playwright/loc31-${theme}-${width}.png` })
    }
  }
  const download = page.waitForEvent('download')
  await page.evaluate((rows) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)]))
    a.download = 'layout.json'
    a.click()
  }, rows)
  await (await download).saveAs('output/playwright/layout.json')
  const failed = rows.filter(row => !row.pass)
  if (failed.length)
    throw new Error(JSON.stringify({ failed }))
  return { passed: rows.length, widths: rows.slice(0, 6).map(r => [r.requestedWidth, r.cssWidth, r.dpr, r.visualScale]) }
}
