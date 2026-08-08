import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

/**
 * Targeted Wave 5 checks — HR admin payroll flows.
 * The mutation flow (create → edit → finalize → locked) uses a far-future
 * month derived from the clock, so reruns never collide with seeded runs
 * or earlier E2E runs. cleanup_e2e.sql removes runs dated 2030+.
 * Future-dated runs are excluded from summary cards and the dashboard KPI
 * by design, so E2E runs never distort the demo.
 */

const RUN_MONTHS = 2030 * 12 + (Math.floor(Date.now() / 1000) % 600)
const RUN_YEAR = Math.floor(RUN_MONTHS / 12)
const RUN_MONTH = (RUN_MONTHS % 12) + 1
const RUN_INPUT = `${RUN_YEAR}-${String(RUN_MONTH).padStart(2, '0')}`
const RUN_PERIOD = new Date(RUN_YEAR, RUN_MONTH - 1, 1).toLocaleString('en-US', {
  month: 'long',
  year: 'numeric',
})

async function openPayroll(page: Page) {
  await page.goto('/payroll')
  await expect(page.getByRole('heading', { name: 'Payroll' })).toBeVisible({ timeout: 15_000 })
}

test.describe('HR admin — Payroll', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop flows — mobile essentials are covered below')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('payroll page loads with summary cards and seeded runs', async ({ page }) => {
    await openPayroll(page)
    await expect(page.getByText('Current Payroll')).toBeVisible()
    await expect(page.getByText('Net Payroll')).toBeVisible()
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })
    // Seeded history: paid + finalized + draft all present.
    await expect(page.locator('table tbody tr', { hasText: 'Paid' }).first()).toBeVisible()
    await expect(page.locator('table tbody tr', { hasText: 'Finalized' }).first()).toBeVisible()
    await expect(page.locator('table tbody tr', { hasText: 'Draft' }).first()).toBeVisible()
  })

  test('employee payroll entries display for the selected run', async ({ page }) => {
    await openPayroll(page)
    await page.getByRole('tab', { name: 'Employee Payroll' }).click()
    await expect(page.getByLabel('Select payroll run')).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('GE-1008').first()).toBeVisible()
  })

  test('currency switch converts displayed payroll values', async ({ page }) => {
    await openPayroll(page)
    const netCell = page.locator('table tbody tr').first().locator('td').nth(4)
    await expect(netCell).toBeVisible({ timeout: 15_000 })
    const usdText = (await netCell.innerText()).trim()
    await page.getByLabel('Display currency').selectOption('PKR')
    await expect(netCell).not.toHaveText(usdText, { timeout: 15_000 })
  })

  test('create run → edit draft entry → finalize → locked', async ({ page }) => {
    test.slow() // full lifecycle round-trip against live Supabase
    await openPayroll(page)

    // Create (far-future month keeps reruns collision-free).
    await page.getByRole('button', { name: /new payroll run/i }).click()
    await page.getByLabel('Payroll month').fill(RUN_INPUT)
    await page.getByRole('button', { name: /create run/i }).click()
    await expect(page.getByText('Payroll run created as draft.')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Dismiss notification' }).first().click().catch(() => {})
    const runRow = page.locator('table tbody tr', { hasText: RUN_PERIOD }).first()
    await expect(runRow).toBeVisible({ timeout: 15_000 })

    // Edit a draft entry.
    await page.getByRole('tab', { name: 'Employee Payroll' }).click()
    await page.getByLabel('Select payroll run').selectOption({ label: `${RUN_PERIOD} — Draft` })
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /^edit payroll for/i }).first().click()
    await page.getByLabel('Allowances (USD)').fill('500')
    await page.getByLabel('Deductions (USD)').fill('120')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Payroll entry updated.')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Dismiss notification' }).first().click().catch(() => {})

    // Finalize from the runs tab.
    await page.getByRole('tab', { name: 'Payroll Runs' }).click()
    await page.getByRole('button', { name: `Finalize payroll for ${RUN_PERIOD}` }).click()
    await expect(page.getByText(/entries become read-only/i)).toBeVisible()
    await page.getByRole('button', { name: 'Finalize payroll' }).click()
    await expect(page.getByText(`${RUN_PERIOD} payroll finalized.`)).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Dismiss notification' }).first().click().catch(() => {})

    // Entries are now locked and read-only.
    await page.getByRole('tab', { name: 'Employee Payroll' }).click()
    await page.getByLabel('Select payroll run').selectOption({ label: `${RUN_PERIOD} — Finalized` })
    await expect(page.getByText(/read-only — this payroll is locked/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /^edit payroll for/i })).toHaveCount(0)
    await expect(page.getByText('Locked').first()).toBeVisible()
  })

  test('employee profile payroll shows latest snapshot', async ({ page }) => {
    await page.goto('/people')
    await page.getByLabel('Search directory').fill('Priya')
    await page.getByRole('button', { name: /priya sharma/i }).first().click()
    await expect(page).toHaveURL(/\/people\//)
    await page.getByRole('tab', { name: 'Payroll' }).click()
    await expect(page.getByText('Latest payroll')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Month')).toBeVisible()
    await expect(page.getByText('Net pay')).toBeVisible()
  })

  test('dashboard payroll KPI uses real run data', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Monthly Payroll', { exact: true })).toBeVisible({ timeout: 15_000 })
    // Hint = "<Month Year> · Finalized|Paid" from the latest non-draft run.
    await expect(page.getByText(/· (Finalized|Paid)/).first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Payroll — mobile essentials', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('payroll renders without horizontal overflow', async ({ page }) => {
    await page.goto('/payroll')
    await expect(page.getByRole('heading', { name: 'Payroll' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Current Payroll')).toBeVisible()
    await expect(page.locator('.md\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.getByRole('tab', { name: 'Employee Payroll' }).click()
    await expect(page.locator('.md\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
