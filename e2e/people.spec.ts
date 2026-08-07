import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

async function fillRequiredEmployeeFields(
  page: Page,
  fields: { code: string; email: string; firstName?: string; lastName?: string },
) {
  const dialog = page.getByRole('dialog', { name: /add employee/i })
  await dialog.getByLabel(/first name/i).fill(fields.firstName ?? 'E2E')
  await dialog.getByLabel(/last name/i).fill(fields.lastName ?? 'Bot')
  await dialog.getByLabel(/work email/i).fill(fields.email)
  await dialog.getByLabel(/employee code/i).fill(fields.code)
  await dialog.getByLabel(/^department$/i).selectOption({ index: 1 })
  await dialog.getByLabel(/^designation$/i).selectOption({ index: 1 })
  await dialog.getByLabel(/work location/i).selectOption({ index: 1 })
  await dialog.getByLabel(/joining date/i).fill('2026-01-05')
  await dialog.getByLabel(/base salary/i).fill('1000')
}

test.describe('People directory', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/people')
  })

  test('directory loads with result count and rows', async ({ page }) => {
    await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 15_000 })
  })

  test('search filters results', async ({ page }) => {
    await page.getByLabel('Search directory').fill('Priya')
    await expect(page.getByText('Priya Sharma').first()).toBeVisible({ timeout: 10_000 })
  })

  test('department filter works', async ({ page }) => {
    await page.getByLabel('Filter by department').selectOption({ label: 'Engineering' })
    await expect(page.getByText(/showing/i)).toBeVisible()
    await expect(page.getByText('Engineering').first()).toBeVisible()
  })

  test('pagination works', async ({ page }) => {
    await expect(page.getByText(/page 1 of/i)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /next page/i }).click()
    await expect(page.getByText(/page 2 of/i)).toBeVisible()
  })

  test('employee profile opens from the directory', async ({ page }) => {
    await page.getByLabel('Search directory').fill('Amara')
    await page.getByRole('button', { name: /amara okafor/i }).first().click()
    await expect(page).toHaveURL(/\/people\/.+/)
    await expect(page.getByRole('heading', { name: /amara okafor/i })).toBeVisible()
  })

  test('direct URL load of /people works after refresh', async ({ page }) => {
    await page.reload()
    await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 15_000 })
  })

  test('add employee drawer opens and validates', async ({ page }) => {
    await page.getByRole('button', { name: /add employee/i }).first().click()
    await expect(page.getByRole('dialog', { name: /add employee/i })).toBeVisible()
    // Submitting an empty form must surface inline errors, not save.
    await page.getByRole('button', { name: /^add employee$/i }).last().click()
    await expect(page.getByText(/first name is required/i)).toBeVisible()
  })

  test('valid employee creation succeeds and appears in the directory', async ({ page }) => {
    const stamp = Date.now().toString().slice(-8)
    await page.getByRole('button', { name: /add employee/i }).first().click()
    await fillRequiredEmployeeFields(page, {
      code: `E2E-${stamp}`,
      email: `e2e.bot.${stamp}@demo.growthifyedge.com`,
      firstName: 'E2E',
      lastName: `Bot${stamp}`,
    })
    // Keep e2e records out of the active headcount.
    await page
      .getByRole('dialog', { name: /add employee/i })
      .getByLabel(/employment status/i)
      .selectOption('inactive')
    await page.getByRole('button', { name: /^add employee$/i }).last().click()
    await expect(page.getByText(/employee added successfully/i)).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Search directory').fill(`E2E-${stamp}`)
    await expect(page.getByText(`Bot${stamp}`).first()).toBeVisible({ timeout: 10_000 })
  })

  test('duplicate employee code is rejected', async ({ page }) => {
    await page.getByRole('button', { name: /add employee/i }).first().click()
    await fillRequiredEmployeeFields(page, {
      code: 'GE-1001', // seeded code
      email: `dup.test.${Date.now()}@demo.growthifyedge.com`,
    })
    await page.getByRole('button', { name: /^add employee$/i }).last().click()
    await expect(page.getByText(/already in use/i)).toBeVisible({ timeout: 15_000 })
  })

  test('edit employee succeeds', async ({ page }) => {
    await page.getByLabel('Search directory').fill('Amara')
    await page.getByRole('button', { name: /amara okafor/i }).first().click()
    await page.getByRole('button', { name: /edit employee/i }).click()
    const dialog = page.getByRole('dialog', { name: /edit employee/i })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/^phone$/i).fill(`+92-300-1000001`)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/employee updated successfully/i)).toBeVisible({ timeout: 15_000 })
  })
})
