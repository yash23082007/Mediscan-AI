const { test, expect } = require('@playwright/test')

const patientCredentials = {}
const uniqueEmail = () => `patient-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`

async function choose(page, label) {
  await page.locator('.option-target').filter({ hasText: label }).click()
  await page.getByRole('button', { name: /Save & Continue/ }).click()
}

test('patient can register, complete symptom intake, and see a persisted model result or abstention', async ({ page }) => {
  patientCredentials.email = uniqueEmail()
  patientCredentials.password = 'LocalTest-Password-2026!'
  patientCredentials.name = `E2E Synthetic Patient ${Date.now()}`
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Care begins with clarity.' })).toBeVisible()
  await page.getByRole('link', { name: 'Begin Assessment' }).click()

  await page.getByLabel('Your name').fill(patientCredentials.name)
  await page.getByLabel('Email Address').fill(patientCredentials.email)
  await page.getByLabel('Password', { exact: true }).fill(patientCredentials.password)
  await page.getByLabel('Confirm Password').fill(patientCredentials.password)
  await page.getByRole('button', { name: /Proceed to Health Baseline/ }).click()
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible()
  await page.locator('#reg-age').fill('34')
  await page.locator('#reg-gender').selectOption('prefer_not_to_say')
  await page.locator('#reg-allergies').fill('E2E synthetic test value')
  await page.getByRole('button', { name: 'Complete Registration' }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.goto('/questionnaire')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What is your primary concern today?')
  await choose(page, 'Fever / Flu-like symptoms')
  await choose(page, 'Mild fever')
  await choose(page, '2-3 days')
  await choose(page, 'Dry cough')
  await page.locator('.option-target').filter({ hasText: 'Headache' }).click()
  await page.locator('.option-target').filter({ hasText: 'Chills / shivering' }).click()
  await page.getByRole('button', { name: /Save & Continue/ }).click()
  await choose(page, 'Partially')
  await choose(page, '3 - Moderate')
  await choose(page, 'No difficulty')

  await expect(page).toHaveURL(/\/diagnosis\?id=/, { timeout: 30000 })
  const diagnosisUrl = new URL(page.url())
  patientCredentials.diagnosisUrl = `${diagnosisUrl.pathname}${diagnosisUrl.search}`
  await expect(page.getByText(/Model Estimate|No condition estimate available/).first()).toBeVisible()
  await expect(page.getByText(/not clinically validated|not a diagnosis/i).first()).toBeVisible()
  expect(runtimeErrors).toEqual([])
})

test('synthetic local administrator can review a submitted case and the patient sees the updated status', async ({ page, browser }) => {
  test.skip(!process.env.E2E_ADMIN_PASSWORD, 'Set E2E_ADMIN_PASSWORD to the one-time password printed by seed-demo.js')
  test.skip(!patientCredentials.diagnosisUrl, 'The preceding patient assessment did not create a diagnosis')
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  await page.goto('/login')
  await page.getByLabel('Email Address').fill('demo-admin@local.invalid')
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/doctor/)
  await expect(page.getByRole('heading', { name: /Physician Triage & Review Workspace/ })).toBeVisible()
  await page.goto('/doctor/submissions')
  const patientRow = page.getByRole('row').filter({ hasText: patientCredentials.name })
  await expect(patientRow).toBeVisible({ timeout: 15000 })
  await patientRow.getByRole('link', { name: 'Clinical Review' }).click()
  await expect(page.getByRole('heading', { name: new RegExp(`Patient Dossier.*${patientCredentials.name}`) })).toBeVisible()
  await page.getByRole('button', { name: /Approve Diagnosis/ }).click()
  await page.getByRole('button', { name: 'Submit Physician Evaluation' }).click()
  await expect(page.getByRole('status')).toContainText('Review recorded')

  const patientContext = await browser.newContext()
  const patientPage = await patientContext.newPage()
  await patientPage.goto('/login')
  await patientPage.getByLabel('Email Address').fill(patientCredentials.email)
  await patientPage.getByLabel('Password', { exact: true }).fill(patientCredentials.password)
  await patientPage.getByRole('button', { name: 'Sign In' }).click()
  await expect(patientPage).toHaveURL(/\/dashboard/)
  await patientPage.goto(patientCredentials.diagnosisUrl)
  await expect(patientPage.getByText('Case reviewed')).toBeVisible()
  expect(runtimeErrors).toEqual([])
  await patientContext.close()
})
