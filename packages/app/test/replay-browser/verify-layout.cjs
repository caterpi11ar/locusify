// Playwright CLI run-code; isolated browser profile with local API fixtures.
// eslint-disable-next-line no-unused-expressions
async (page) => {
  await page.route('**/api/v1/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    const data = pathname.endsWith('/auth/me')
      ? { id: 'layout-test', email: 'layout@example.test' }
      : pathname.endsWith('/profile')
        ? { id: 'layout-test', display_name: 'Layout Test', avatar_url: '', provider: 'email' }
        : pathname.endsWith('/subscriptions') ? { plan: 'free', status: 'active' } : []
    return route.fulfill({ json: { success: true, data } })
  })
  await page.addInitScript(() => {
    const OriginalWorker = Worker
    window.__layoutFrames = []
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args)
        if (String(args[0]).includes('encoder.worker')) {
          const send = this.postMessage.bind(this)
          this.postMessage = (data, transfer) => {
            if (data.type === 'frame')
              window.__layoutFrames.push({ width: data.frame.displayWidth, height: data.frame.displayHeight, timestamp: data.frame.timestamp })
            send(data, transfer)
          }
        }
      }
    }
  })
  await page.setViewportSize({ width: 1920, height: 800 })
  await page.goto(new URL('/zh-CN/', page.url()).href)
  await page.waitForFunction(() => window.__locusify)
  await page.evaluate(async () => {
    window.__locusify.signIn()
    window.__locusify.dismissOverlays()
  })
  await page.reload()
  await page.waitForSelector('[data-testid="replay-capture"]')
  await page.evaluate(async () => {
    const storeUrl = name => performance.getEntriesByType('resource').findLast(entry => new URL(entry.name).pathname === `/src/stores/${name}.ts`).name
    const { useSettingsStore } = await import(storeUrl('settingsStore'))
    useSettingsStore.getState().setAvatarSource({ type: 'none' })
    const { usePhotoStore } = await import(storeUrl('photoStore'))
    const { createDemoPhotos } = await import('/src/lib/demo-photos.ts')
    usePhotoStore.getState().addPhotos((await createDemoPhotos()).slice(0, 2))
  })
  await page.getByRole('button', { name: '查看轨迹', exact: true }).click()
  await page.waitForSelector('[data-testid="replay-surface"]')
  const measure = () => page.locator('[data-testid="replay-capture"]').evaluate((capture) => {
    const canvas = capture.querySelector('[data-testid="replay-surface"]')
    const rect = capture.getBoundingClientRect()
    const workspace = capture.parentElement.getBoundingClientRect()
    return { width: rect.width, height: rect.height, x: rect.x, y: rect.y, workspaceWidth: workspace.width, workspaceHeight: workspace.height, canvasWidth: canvas.width, canvasHeight: canvas.height, unit: Number.parseFloat(capture.style.getPropertyValue('--replay-unit')) }
  })
  const snapshots = []
  for (const [width, height] of [[1920, 800], [1280, 900], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height })
    await page.waitForFunction(() => {
      const capture = document.querySelector('[data-testid="replay-capture"]')
      const canvas = capture?.querySelector('[data-testid="replay-surface"]')
      return canvas && Math.abs(canvas.width / canvas.height - capture.clientWidth / capture.clientHeight) < 0.002
    })
    const size = await measure()
    if (Math.abs(size.width - size.workspaceWidth) > 1 || Math.abs(size.height - size.workspaceHeight) > 1)
      throw new Error(`Preview leaves unused workspace: ${JSON.stringify(size)}`)
    snapshots.push(size)
  }
  await page.setViewportSize({ width: 1920, height: 800 })
  await page.screenshot({ path: 'output/playwright/replay-wide-workspace.png' })
  await page.getByRole('button', { name: '开始回放', exact: true }).click()
  await page.waitForFunction(() => window.__layoutFrames.length > 30, undefined, { timeout: 60000 })
  for (const [width, height] of [[1920, 800], [1280, 900]]) {
    await page.setViewportSize({ width, height })
    await page.waitForFunction(() => {
      const capture = document.querySelector('[data-testid="replay-capture"]')
      const rect = capture.getBoundingClientRect()
      return Math.abs(rect.width / rect.height - 16 / 9) < 0.002 && Math.abs(rect.x * 2 + rect.width - innerWidth) < 1
    })
    const size = await measure()
    if (size.canvasWidth !== 1920 || size.canvasHeight !== 1080 || Math.abs(size.y * 2 + size.height - height) > 1)
      throw new Error(`Recording frame is distorted or not centered: ${JSON.stringify(size)}`)
  }
  await page.getByRole('button', { name: '退出', exact: true }).click()
  await page.waitForSelector('[data-testid="replay-surface"]', { state: 'detached' })
  await page.getByRole('button', { name: '查看轨迹', exact: true }).click()
  await page.waitForSelector('[data-testid="replay-surface"]')
  const restored = await measure()
  if (Math.abs(restored.width - restored.workspaceWidth) > 1 || Math.abs(restored.height - restored.workspaceHeight) > 1)
    throw new Error('Preview dimensions did not restore after recording exit')
  const frames = await page.evaluate(() => window.__layoutFrames)
  if (!frames.every(frame => frame.width === 1920 && frame.height === 1080))
    throw new Error('Encoder received a frame with the browsing aspect ratio')
  await page.getByRole('button', { name: '退出', exact: true }).click()
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    window.__sceneImageWaits = 0
    HTMLImageElement.prototype.decode = function () {
      window.__sceneImageWaits++
      return gate.then(() => decode.call(this))
    }
    window.__releaseSceneImages = () => {
      HTMLImageElement.prototype.decode = decode
      release()
    }
  })
  try {
    await page.getByRole('button', { name: '查看轨迹', exact: true }).click()
    await page.waitForFunction(() => window.__sceneImageWaits > 0)
    await page.getByRole('button', { name: '开始回放', exact: true }).click()
    await page.waitForSelector('[data-testid="replay-intro"]')
    const covered = await page.locator('[data-testid="replay-intro"]').evaluate((intro) => {
      const css = getComputedStyle(intro)
      const probe = document.createElement('canvas').getContext('2d')
      probe.fillStyle = css.backgroundColor
      probe.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data
      return css.opacity === '1' && a === 255 && Math.max(r, g, b) < 20 && !document.querySelector('[data-testid="replay-surface"]')
    })
    if (!covered)
      throw new Error('Preparing scene exposed a bare map before the first complete frame')
  }
  finally {
    await page.evaluate(() => window.__releaseSceneImages())
  }
  await page.waitForSelector('[data-testid="replay-surface"]')
  await page.waitForFunction(previous => window.__layoutFrames.length > previous, frames.length)
  await page.getByRole('button', { name: '退出', exact: true }).click()
  return { snapshots, restored, encodedFrames: frames.length, allFrames1080p: true, coldStartCovered: true }
}
