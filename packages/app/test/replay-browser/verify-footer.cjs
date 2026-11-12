// Compare the real legacy DOM card and the scene, including dynamic number widths.
// eslint-disable-next-line no-unused-expressions
async (page) => {
  const results = []
  await page.setViewportSize({ width: 1280, height: 720 })
  for (const language of ['en', 'zh-CN']) {
    await page.goto(new URL(`/test/brand-browser/states.html?state=stats&lang=${language}`, page.url()).href)
    await page.getByText('Locusify', { exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `output/playwright/footer-dom-${language}.png` })
    const result = await page.evaluate(async () => {
      const assert = (condition, message) => {
        if (!condition)
          throw new Error(message)
      }
      const brand = Array.from(document.querySelectorAll('span')).find(e => e.textContent === 'Locusify')
      const card = brand.parentElement.parentElement
      const { ReplaySurface } = await import('/src/lib/replay/replay-surface.ts')
      const loaded = name => performance.getEntriesByType('resource').findLast(e => new URL(e.name).pathname === `/src/stores/${name}.ts`).name
      const { useReplayStore } = await import(loaded('replayStore'))
      const { useSettingsStore } = await import(loaded('settingsStore'))
      useSettingsStore.setState({ avatarSource: { type: 'none' } })
      const marker = { id: 'footer-check', latitude: 31, longitude: 121, photo: { title: 'Journey', thumbnailUrl: '/src/assets/locusify.png' } }
      useReplayStore.setState({ waypoints: [{ id: marker.id, marker, timestamp: new Date() }], segments: [], currentWaypointIndex: 0, currentPosition: null, status: 'configuring', earthZoomPhase: 'done', recordingActive: true })
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;inset:0;width:1280px;height:720px;z-index:9999'
      document.body.append(host)
      const mapCanvas = document.createElement('canvas')
      mapCanvas.width = 1920
      mapCanvas.height = 1080
      const scene = await ReplaySurface.create({ getCanvas: () => mapCanvas, getContainer: () => host, on() {}, off() {}, triggerRepaint() {}, areTilesLoaded: () => true }, host, new AbortController().signal, () => {})
      scene.update(useReplayStore.getState())
      const rows = card.querySelectorAll('.tabular-nums')
      for (const [days, distance] of [['0', '0.00'], ['123', '1234.56']]) {
        rows[0].firstElementChild.textContent = days
        rows[1].firstElementChild.textContent = distance
        scene.days.text = days
        scene.distance.text = distance
        scene.layoutStats()
        const references = Array.from(card.querySelectorAll('span'))
        for (const text of scene.stats.children.filter(child => child.text !== undefined)) {
          const reference = references.find(el => el.textContent === text.text)
          const rect = reference.getBoundingClientRect()
          const css = getComputedStyle(reference)
          assert(text.style.fontFamily === css.fontFamily && String(text.style.fontWeight) === css.fontWeight, `Font mismatch: ${text.text}`)
          assert(Math.abs(text.x - rect.x) < 0.05, `Horizontal alignment mismatch: ${text.text}`)
          assert(Math.abs(text.advanceWidth - rect.width) < 0.05, `Text advance width mismatch: ${text.text}`)
        }
        for (const [index, value, unit] of [[0, scene.days, scene.daysUnit], [1, scene.distance, scene.distanceUnit]]) {
          const baselineMarker = document.createElement('span')
          baselineMarker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
          rows[index].append(baselineMarker)
          const baseline = baselineMarker.getBoundingClientRect().top
          baselineMarker.remove()
          assert(Math.abs(scene.stats.y + value.y + value.baseline - baseline) < 0.6, 'Number baseline differs from DOM')
          assert(Math.abs(value.y + value.baseline - unit.y - unit.baseline) < 0.01, 'Unit does not share number baseline')
        }
      }
      const bounds = card.getBoundingClientRect()
      assert(scene.statsHeight === bounds.height && scene.stats.y === bounds.y, 'Stats card height or position differs from DOM')
      const attribution = scene.stage.children.find(child => child.children?.some(text => text.text?.includes('OpenStreetMap')))
      assert(Math.abs(attribution.x + attribution.width - 1264) < 0.1, 'Copyright is not right aligned')
      assert(Math.abs(attribution.y + attribution.height - (scene.stats.y - 8)) < 0.1, 'Copyright overlaps or floats away from the card')
      scene.renderer.render({ container: scene.stage })
      window.__footerScene = scene
      return { cardHeight: bounds.height, copyrightRightInset: 16, copyrightCardGap: 8, numbers: ['0 / 0.00', '123 / 1234.56'] }
    })
    await page.screenshot({ path: `output/playwright/footer-canvas-${language}.png` })
    await page.evaluate(() => {
      window.__footerScene.dispose()
      delete window.__footerScene
    })
    results.push({ language, ...result })
  }
  return results
}
