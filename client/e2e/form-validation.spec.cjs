const { test, expect } = require('@playwright/test')

test('registration rejects an invalid email before advancing to the health profile', async ({ page }) => {
  await page.goto('/register')

  await page.getByLabel('Your name').fill('QA Sample User')
  await page.getByLabel('Email Address').fill('not-an-email')
  await page.getByLabel('Password', { exact: true }).fill('Valid-QA-Pass1!')
  await page.getByLabel('Confirm Password').fill('Valid-QA-Pass1!')
  await page.getByRole('button', { name: /Proceed to Health Baseline/ }).click()

  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  expect(await page.locator('#reg-email').evaluate(element => element.checkValidity())).toBe(false)
})

test('empty sign-in is blocked by browser validation without calling the login API', async ({ page }) => {
  let loginRequests = 0
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/api/auth/login')) loginRequests += 1
  })

  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign In' }).click()

  expect(await page.locator('#login-email').evaluate(element => element.checkValidity())).toBe(false)
  expect(await page.locator('#login-password').evaluate(element => element.checkValidity())).toBe(false)

  await page.getByLabel('Email Address').fill('not-an-email')
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-QA-Password!')
  await page.getByRole('button', { name: 'Sign In' }).click()
  expect(await page.locator('#login-email').evaluate(element => element.checkValidity())).toBe(false)
  expect(loginRequests).toBe(0)
})

test('registration blocks empty, weak, and mismatched credentials without submitting', async ({ page }) => {
  let registrationRequests = 0
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/api/auth/register/patient')) registrationRequests += 1
  })

  await page.goto('/register')
  await page.getByRole('button', { name: /Proceed to Health Baseline/ }).click()
  expect(await page.locator('#reg-name').evaluate(element => element.checkValidity())).toBe(false)

  await page.getByLabel('Your name').fill('QA Sample User')
  await page.getByLabel('Email Address').fill('qa-user@example.test')
  await page.getByLabel('Password', { exact: true }).fill('short')
  await page.getByLabel('Confirm Password').fill('short')
  await page.getByRole('button', { name: /Proceed to Health Baseline/ }).click()
  expect(await page.locator('#reg-password').evaluate(element => element.checkValidity())).toBe(false)
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

  await page.getByLabel('Password', { exact: true }).fill('Synthetic-QA-Password!')
  await page.getByLabel('Confirm Password').fill('Different-QA-Password!')
  await page.getByRole('button', { name: /Proceed to Health Baseline/ }).click()
  await expect(page.getByRole('region', { name: 'Account access' }).getByRole('alert')).toContainText('Passwords do not match.')
  expect(registrationRequests).toBe(0)
})

test('registration enforces baseline age before submitting account data', async ({ page }) => {
  let registrationRequests = 0
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/api/auth/register/patient')) registrationRequests += 1
  })

  await page.goto('/register')
  await page.getByLabel('Your name').fill('QA Sample User')
  await page.getByLabel('Email Address').fill('qa-user@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-QA-Password!')
  await page.getByLabel('Confirm Password').fill('Synthetic-QA-Password!')
  await page.getByRole('button', { name: /Proceed to Health Baseline/ }).click()
  await page.getByLabel('Age (Years)').fill('0')
  await page.getByLabel('Sex / gender').selectOption('prefer_not_to_say')
  await page.getByRole('button', { name: 'Complete Registration' }).click()

  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible()
  expect(await page.locator('#reg-age').evaluate(element => element.checkValidity())).toBe(false)
  expect(registrationRequests).toBe(0)
})

test('dataset transparency page is available without an account', async ({ page }) => {
  await page.goto('/datasets')

  await expect(page).toHaveURL(/\/datasets$/)
  await expect(page.getByRole('heading', { name: 'Clinical Datasets & Training Transparency' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Begin Assessment' }).last()).toHaveAttribute('href', '/register')
})

test('homepage and registration remain within common mobile and desktop widths', async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const homeWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(homeWidth, `homepage overflows at ${width}px`).toBeLessThanOrEqual(width)

    await page.goto('/register')
    const registrationWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(registrationWidth, `registration overflows at ${width}px`).toBeLessThanOrEqual(width)

    await page.goto('/login')
    const loginWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(loginWidth, `sign-in page overflows at ${width}px`).toBeLessThanOrEqual(width)
  }
})
