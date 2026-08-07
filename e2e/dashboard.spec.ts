import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

test.describe('Dashboard', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('KPI cards render with values', async ({ page }) => {
    await expect(page.getByText('Total Employees')).toBeVisible()
    await expect(page.getByText('Active Employees')).toBeVisible()
    await expect(page.getByText('Monthly Payroll Estimate')).toBeVisible()
    await expect(page.getByText('Pending HR Actions')).toBeVisible()
  })

  test('charts render', async ({ page }) => {
    await expect(page.getByText('Workforce by Department')).toBeVisible()
    await expect(page.getByText('Attendance Trend')).toBeVisible()
    await expect(page.getByText('Recruitment Pipeline')).toBeVisible()
    await expect(page.getByText('Payroll by Department')).toBeVisible()
  })

  test('currency selector updates financial values', async ({ page }) => {
    const selector = page.getByLabel('Display currency').first()
    await selector.selectOption('PKR')
    await expect(page.getByText(/Rs\./).first()).toBeVisible({ timeout: 10_000 })
    await selector.selectOption('USD')
    await expect(page.getByText(/\$/).first()).toBeVisible()
  })

  test('mobile layout has no horizontal overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile project only')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow).toBe(false)
  })
})
