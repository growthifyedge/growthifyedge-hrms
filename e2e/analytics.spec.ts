import { expect, test } from '@playwright/test'
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  MANAGER_EMAIL,
  MANAGER_PASSWORD,
  hasAdminCreds,
  hasManagerCreds,
  signIn,
} from './helpers'

/**
 * Targeted Wave 6 checks. Analytics is read-only — these tests mutate
 * nothing, so no cleanup is ever required.
 */

test.describe('HR admin — Analytics', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks — mobile essentials are covered below')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({ timeout: 15_000 })
  })

  test('executive KPIs render real values', async ({ page }) => {
    await expect(page.getByText('Total Employees')).toBeVisible()
    // Live headcount from the seeded org (36 minus archived = 35).
    await expect(page.getByText('35', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/latest working day/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Average Performance Rating')).toBeVisible()
    await expect(page.getByText(/\d+ completed reviews/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Latest Payroll')).toBeVisible()
    await expect(page.getByText(/Net ·/)).toBeVisible({ timeout: 15_000 })
  })

  test('workforce, attendance and leave sections render', async ({ page }) => {
    await expect(page.getByText('Workforce by Department')).toBeVisible()
    await expect(page.getByText('Employment Status')).toBeVisible()
    await expect(page.getByText('Location Distribution')).toBeVisible()
    await expect(page.getByText('Attendance Mix')).toBeVisible()
    await expect(page.getByText('Leave Overview')).toBeVisible()
    await expect(page.getByText('Pending', { exact: true })).toBeVisible({ timeout: 15_000 })
    // Chart legend proves the stacked attendance chart rendered.
    await expect(page.getByText('Remote', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('recruitment and performance sections render', async ({ page }) => {
    await expect(page.getByText('Candidate Pipeline')).toBeVisible()
    await expect(page.getByText('Hiring Snapshot')).toBeVisible()
    await expect(page.getByText('Screening').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Rating Distribution')).toBeVisible()
    await expect(page.getByText('Goal Progress')).toBeVisible()
    await expect(page.getByText('Exceeds Expectations').first()).toBeVisible({ timeout: 15_000 })
  })

  test('payroll analytics render and follow the currency switch', async ({ page }) => {
    await expect(page.getByText('Payroll Trend')).toBeVisible()
    await expect(page.getByText('Payroll by Department')).toBeVisible()
    const latestPayrollCard = page
      .locator('div')
      .filter({ has: page.getByText('Latest Payroll', { exact: true }) })
      .last()
    await expect(latestPayrollCard).toBeVisible({ timeout: 15_000 })
    const usdText = (await latestPayrollCard.innerText()).trim()
    await page.getByLabel('Display currency').selectOption('PKR')
    await expect(latestPayrollCard).not.toHaveText(usdText, { timeout: 15_000 })
  })

  test('navigation presents the finished product', async ({ page }) => {
    for (const label of [
      'Dashboard',
      'People',
      'Time & Leave',
      'Recruitment',
      'Performance',
      'Payroll',
      'Analytics',
      'Settings',
    ]) {
      await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible()
    }
    await expect(page.getByText('Soon')).toHaveCount(0)
  })
})

test.describe('Manager — Analytics restricted', () => {
  test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop check is sufficient')

  test('nav hidden and direct access blocked', async ({ page }) => {
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
    await expect(page.getByRole('link', { name: 'Analytics' })).toHaveCount(0)
    await page.goto('/analytics')
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Payroll Trend')).toHaveCount(0)
  })
})

test.describe('Analytics — mobile essentials', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test('analytics stacks without horizontal overflow', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Total Employees')).toBeVisible()
    await expect(page.getByText('Payroll Trend')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
