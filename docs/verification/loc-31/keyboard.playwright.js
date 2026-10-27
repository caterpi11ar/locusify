// playwright-cli run-code evaluates this function expression.
// eslint-disable-next-line no-unused-expressions
async (page) => {
  const results = []
  for (const width of [639, 640, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.waitForTimeout(350)
    await page.getByRole('button', { name: 'Close', exact: true }).focus()
    const order = []
    for (let i = 0; i < 3; i++) {
      order.push(await page.evaluate(() => document.activeElement.textContent || document.activeElement.getAttribute('aria-label')))
      await page.keyboard.press('Tab')
    }
    if (order.join('|') !== 'Close|选择照片|体验示例')
      throw new Error(JSON.stringify(order))
    await page.getByRole('button', { name: '选择照片', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    const drawer = await page.locator('.ant-drawer-open').evaluate(el => ({ classes: el.className, mask: !!el.querySelector('.ant-drawer-mask'), width: el.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect().width }))
    const mobile = width < 640
    if (!drawer.classes.includes(mobile ? 'ant-drawer-bottom' : 'ant-drawer-left') || drawer.mask !== mobile)
      throw new Error(JSON.stringify(drawer))
    results.push({ width, order, upload: drawer })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(350)
    if (!(await page.getByRole('button', { name: '选择照片', exact: true }).isVisible())) {
      if (width < 640)
        await page.getByRole('button', { name: 'Menu', exact: true }).click()
      await page.getByRole('button', { name: '使用帮助', exact: true }).click()
    }
  }
  return results
}
