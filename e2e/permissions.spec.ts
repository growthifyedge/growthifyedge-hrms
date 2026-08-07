import { expect, test } from '@playwright/test'
import {
  MANAGER_EMAIL,
  MANAGER_PASSWORD,
  hasManagerCreds,
  signIn,
} from './helpers'

test.describe('Manager restrictions', () => {
  test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
  })

  test('manager sees team overview, not executive payroll', async ({ page }) => {
    await expect(page.getByText(/team overview/i)).toBeVisible()
    await expect(page.getByText('Monthly Payroll Estimate')).toHaveCount(0)
  })

  test('manager cannot access Settings', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText(/access restricted/i)).toBeVisible()
  })

  test('manager has no Settings navigation item', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0)
  })

  test('manager has no Add Employee button', async ({ page }) => {
    await page.goto('/people')
    await expect(page.getByRole('button', { name: /add employee/i })).toHaveCount(0)
  })

  test('manager directory is scoped to self and direct reports', async ({ page }) => {
    await page.goto('/people')
    await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 15_000 })
    // The seeded org has 36 employees; a manager must see far fewer.
    const countText = await page.getByText(/of \d+/).first().textContent()
    const total = Number(countText?.match(/of (\d+)/)?.[1] ?? '0')
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(20)
  })
})
