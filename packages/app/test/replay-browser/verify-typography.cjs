// Run through playwright-cli run-code --filename with the Vite app open.
// Real Chrome font resolution + actual scene initialization; no screenshot mocks.
// eslint-disable-next-line no-unused-expressions
async (page) => {
  await page.goto(new URL('/test/brand-browser/states.html?state=intro', page.url()).href)
  await page.waitForSelector('[data-testid="replay-intro"]')
  const result = await page.evaluate(async () => {
    const assert = (condition, message) => {
      if (!condition)
        throw new Error(message)
    }
    const { captionTexture, metadataTexture } = await import('/src/lib/replay/scene-assets.ts')
    const { ReplaySurface } = await import('/src/lib/replay/replay-surface.ts')
    const { prepareSceneTypography } = await import('/src/lib/replay/scene-typography.ts')
    // Reuse Vite's loaded module URL including HMR timestamp, not a second store.
    const storeUrl = name => performance.getEntriesByType('resource').findLast(entry => new URL(entry.name).pathname === `/src/stores/${name}.ts`).name
    const { useReplayStore } = await import(storeUrl('replayStore'))
    const { useSettingsStore } = await import(storeUrl('settingsStore'))
    const typography = await prepareSceneTypography(new AbortController().signal)
    const referenceClasses = {
      body: '',
      captionTitle: 'font-serif text-[1.05rem] font-semibold tracking-[0.02em]',
      captionBody: 'font-serif text-[0.85rem] italic leading-[1.7]',
      date: 'font-handwriting text-[0.65rem]',
      coordinates: 'font-mono text-[0.5rem]',
      introTitle: 'text-4xl font-bold tracking-tight',
      statValue: 'text-base font-semibold tabular-nums',
      statUnit: 'text-2xs font-normal',
    }
    const sample = document.createElement('span')
    document.body.append(sample)
    const expected = {}
    for (const [role, classes] of Object.entries(referenceClasses)) {
      sample.className = classes
      const css = getComputedStyle(sample)
      expected[role] = { fontFamily: css.fontFamily, fontSize: Number.parseFloat(css.fontSize), fontWeight: css.fontWeight, fontStyle: css.fontStyle, letterSpacing: Number.parseFloat(css.letterSpacing) || 0 }
      for (const [key, value] of Object.entries(expected[role]))
        assert(typography[role][key] === value, `${role}.${key} differs from DOM: ${typography[role][key]} / ${value}`)
    }
    sample.remove()

    const marker = { id: 'font-check', latitude: 31, longitude: 121, photo: { title: 'Journey 城市漫游', description: 'Along the river 沿着河流', dateTaken: '2026-01-01', thumbnailUrl: '/src/assets/locusify.png' } }
    const drawn = []
    const originalDraw = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      drawn.push({ text, font: this.font, spacing: this.letterSpacing, maxWidth: args[2] })
      return originalDraw.call(this, text, ...args)
    }
    const textures = []
    try {
      textures.push(captionTexture(marker, false, typography), metadataTexture(marker, 0, 1, false, typography))
      textures.push(captionTexture({ ...marker, photo: { ...marker.photo, title: marker.photo.title.repeat(10) } }, false, typography))
    }
    finally { CanvasRenderingContext2D.prototype.fillText = originalDraw }
    textures.forEach(texture => texture.destroy(true))
    const canonical = document.createElement('canvas').getContext('2d')
    for (const [index, role] of [[0, 'captionTitle'], [1, 'captionBody'], [3, 'date'], [4, 'coordinates']]) {
      const style = expected[role]
      canonical.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
      assert(drawn[index].font === canonical.font, `${role}: actual texture uses wrong font`)
      assert(Number.parseFloat(drawn[index].spacing) === style.letterSpacing, `${role}: actual texture uses wrong spacing`)
    }
    assert(drawn.some(draw => draw.text.endsWith('…')), 'Long title must use ellipsis')
    assert(drawn.every(draw => draw.maxWidth === undefined), 'Do not horizontally squeeze glyphs')

    useSettingsStore.setState({ avatarSource: { type: 'none' } })
    useReplayStore.setState({ waypoints: [{ id: marker.id, marker, timestamp: new Date('2026-01-01') }], segments: [], currentWaypointIndex: 0, currentPosition: null, status: 'configuring', earthZoomPhase: 'done', recordingActive: true })
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;inset:0;width:1280px;height:720px;z-index:9999;background:#161923'
    document.body.append(host)
    const mapCanvas = document.createElement('canvas')
    mapCanvas.width = 1920
    mapCanvas.height = 1080
    const ctx = mapCanvas.getContext('2d')
    ctx.fillStyle = '#253b49'
    ctx.fillRect(0, 0, 1920, 1080)
    const map = { getCanvas: () => mapCanvas, getContainer: () => host, on() {}, off() {}, areTilesLoaded: () => true, triggerRepaint() {} }
    const load = document.fonts.load.bind(document.fonts)
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    let requested
    const request = new Promise((resolve) => {
      requested = resolve
    })
    document.fonts.load = (...args) => {
      requested()
      return gate.then(() => load(...args))
    }
    let scene
    try {
      const pending = ReplaySurface.create(map, host, new AbortController().signal, () => {})
      await request
      assert(!host.querySelector('canvas'), 'Scene must wait for requested fonts before first frame')
      release()
      scene = await pending
    }
    finally { document.fonts.load = load }
    const title = scene.intro.children.find(child => child.text === 'Locusify')
    for (const [label, role] of [[title, 'introTitle'], [scene.days, 'statValue'], [scene.distance, 'statValue'], [scene.daysUnit, 'statUnit']]) {
      for (const [key, value] of Object.entries(expected[role]))
        assert(label.style[key] === value, `Scene ${role}.${key} differs from DOM`)
    }
    scene.update(useReplayStore.getState())
    scene.renderer.render({ container: scene.stage })
    window.__typographyScene = scene
    return { rolesChecked: Object.keys(expected), longTitleTruncated: true, delayedFontsBlockFirstFrame: true, actualIntroFont: title.style.fontFamily, actualIntroWeight: title.style.fontWeight }
  })
  await page.screenshot({ path: 'output/playwright/typography-scene.png' })
  await page.evaluate(() => {
    const copy = document.createElement('canvas')
    copy.width = 160
    copy.height = 90
    const ctx = copy.getContext('2d')
    ctx.drawImage(window.__typographyScene.canvas, 0, 0, 160, 90)
    const pixels = ctx.getImageData(0, 0, 160, 90).data
    let color = 0
    for (let i = 0; i < pixels.length; i += 4) color += pixels[i] + pixels[i + 1] + pixels[i + 2]
    if (color === 0)
      throw new Error('Presented replay canvas was cleared between paints')
    // Simulate the map buffer resizing when entering/leaving a 16:9 recording.
    const scene = window.__typographyScene
    const mapCanvas = scene.map.getCanvas()
    for (const height of [800, 1080]) {
      mapCanvas.height = height
      const mapCtx = mapCanvas.getContext('2d')
      mapCtx.fillStyle = '#253b49'
      mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height)
      scene.pending = true
      scene.paint()
      ctx.drawImage(scene.canvas, 0, 0, 160, 90)
      const pixel = ctx.getImageData(120, 73, 1, 1).data
      if (Math.abs(pixel[0] - 37) > 1 || Math.abs(pixel[1] - 59) > 1 || Math.abs(pixel[2] - 73) > 1)
        throw new Error(`Resized map texture left stale or empty geometry: ${Array.from(pixel)}`)
    }
  })
  await page.evaluate(() => {
    const scene = window.__typographyScene
    scene.intro.visible = true
    scene.renderer.render({ container: scene.stage })
  })
  await page.screenshot({ path: 'output/playwright/typography-intro.png' })
  await page.evaluate(() => {
    window.__typographyScene.dispose()
    delete window.__typographyScene
  })
  return result
}
