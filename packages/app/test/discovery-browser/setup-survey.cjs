// eslint-disable-next-line no-unused-expressions -- playwright-cli evaluates this function expression.
async (page) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url()
    let data = null
    if (url.endsWith('/auth/me'))
      data = { id: 'survey-browser-a', email: 'survey@example.test' }
    if (url.endsWith('/profile'))
      data = { id: 'survey-browser-a', display_name: 'Survey test', provider: 'email' }
    if (url.endsWith('/discovery-source'))
      data = { eligible: true, status: 'pending', source: null }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.addInitScript(() => {
    if (!localStorage.getItem('survey-fixture-initialized')) {
      const token = `e30.${btoa(JSON.stringify({ sub: 'survey-browser-a' }))}.test`
      localStorage.setItem('locusify-tokens', JSON.stringify({ state: { accessToken: token, refreshToken: 'test-only' }, version: 1 }))
      localStorage.setItem('survey-fixture-initialized', 'true')
    }
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('http://127.0.0.1:1053/zh-CN/')
}
