// eslint-disable-next-line no-unused-expressions -- playwright-cli evaluates this function expression.
async (page) => {
  const results = []
  const bodies = []
  let fail = false
  await page.route('**/api/v1/discovery-source', async (route) => {
    if (route.request().method() === 'PUT') {
      bodies.push(route.request().postDataJSON())
      if (fail) {
        await route.fulfill({ status: 500, json: { success: false } })
        return
      }
    }
    const response = await route.fetch({ url: 'http://127.0.0.1:1054/api/v1/discovery-source' })
    await route.fulfill({ response })
  })
  const account = async (id) => {
    await page.evaluate(async (id) => {
      const { useTokenStore } = await import('/src/lib/auth/token-storage.ts')
      const { useAuthStore } = await import('/src/stores/authStore.ts')
      useAuthStore.getState().clearUser()
      useTokenStore.getState().setTokenPair(`e30.${btoa(JSON.stringify({ sub: id }))}.test`, 'test-only')
      useAuthStore.getState().setUser({ id, name: id, email: `${id}@example.test`, provider: 'email', avatarUrl: '' })
    }, id)
  }
  await account('browser-retry')
  await page.getByRole('dialog').waitFor()
  if (!await page.getByRole('button', { name: '提交', exact: true }).isDisabled())
    throw new Error('empty submit enabled')
  await page.getByRole('radio', { name: 'B站', exact: true }).check()
  await page.keyboard.press('ArrowRight')
  if (!await page.getByRole('radio', { name: '抖音', exact: true }).isChecked())
    throw new Error('keyboard selection failed')
  results.push('Native radio arrow selection and empty-submit guard passed')
  fail = true
  await page.getByRole('button', { name: '提交', exact: true }).click()
  await page.getByRole('alert').waitFor()
  if (!await page.getByRole('radio', { name: '抖音', exact: true }).isChecked())
    throw new Error('selection lost')
  fail = false
  await page.getByRole('button', { name: '提交', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  results.push('Failed submit retains selection; retry through actual Next route succeeds')
  for (const [id, label] of [['browser-bilibili', 'B站'], ['browser-xiaohongshu', '小红书']]) {
    await account(id)
    await page.getByRole('radio', { name: label, exact: true }).check()
    await page.getByRole('button', { name: '提交', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
  }
  results.push('All three domestic channels accepted through actual Next route')
  await account('browser-skip')
  await page.getByRole('dialog').waitFor()
  fail = true
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await page.waitForFunction(() => localStorage.getItem('locusify-discovery:v1:browser-skip') === 'skip-pending')
  fail = false
  await page.waitForFunction(() => localStorage.getItem('locusify-discovery:v1:browser-skip') === 'complete')
  results.push('Escape dismisses immediately on failure; outbox synchronizes automatically')
  await account('browser-old')
  await page.waitForResponse(r => r.url().endsWith('/discovery-source') && r.request().method() === 'GET')
  if (await page.getByRole('dialog').count())
    throw new Error('old account shown')
  await account('browser-fresh')
  await page.getByRole('dialog').waitFor()
  results.push('Account switching is isolated; ineligible response never opens survey')
  await page.setViewportSize({ width: 320, height: 568 })
  const bounds = await page.getByRole('dialog').boundingBox()
  if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > 320 || bounds.y + bounds.height > 568)
    throw new Error('mobile overflow')
  await page.getByRole('radio', { name: '其他', exact: true }).check()
  await page.getByRole('button', { name: '提交', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  results.push('320x568 scrolling and footer submission passed')
  if (bodies.some(body => Object.keys(body).length !== 1 || !('source' in body || body.status === 'skipped')))
    throw new Error('unexpected payload data')
  const unauth = await page.request.get('http://127.0.0.1:1054/api/v1/discovery-source')
  if (unauth.status() !== 401)
    throw new Error('unauthenticated request accepted')
  results.push('Payloads contain only source/status; unauthenticated route returns 401')
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { success: true, data: { id: 'browser-fresh', email: 'browser-fresh@example.test' } } }))
  await page.reload()
  await page.waitForFunction(() => document.querySelector('nav') || document.querySelector('canvas'))
  if (await page.getByRole('dialog').count())
    throw new Error('reopened after refresh')
  await page.evaluate(() => localStorage.removeItem('locusify-discovery:v1:browser-fresh'))
  const restored = page.waitForResponse(r => r.url().endsWith('/discovery-source') && r.request().method() === 'GET')
  await page.reload()
  await restored
  if (await page.getByRole('dialog').count())
    throw new Error('reopened after clearing local marker')
  results.push('Refresh and server-restored terminal state suppress the survey without local marker')
  return { results, bodies }
}
