// playwright-cli run-code evaluates this function expression.
// eslint-disable-next-line no-unused-expressions
async (page) => {
  await page.waitForFunction(() => window.__locusify)
  await page.evaluate(async () => {
    window.__locusify.dismissOverlays()
    const { useAuthStore } = await import('/src/stores/authStore.ts')
    useAuthStore.setState({ user: { id: 'local-layout-test', name: 'Local test', email: 'local@example.test', provider: 'email', avatarUrl: '' }, authReady: true })
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/stores/authStore.ts')
    useAuthStore.setState({ user: { id: 'local-layout-test', name: 'Local test', email: 'local@example.test', provider: 'email', avatarUrl: '' }, authReady: true })
  })
  return await page.locator('body').textContent()
}
