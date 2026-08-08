import { expect, test } from '@playwright/test'
import { MANAGER_EMAIL, MANAGER_PASSWORD, hasManagerCreds, signIn } from './helpers'

/**
 * Wave 5 manager restrictions: payroll follows the Wave 1 compensation
 * privacy rule — managers see nothing.
 */

test.describe('Manager — Payroll restrictions', () => {
  test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks are sufficient')

  test.beforeEach(async ({ page }) => {
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
  })

  test('payroll navigation is not offered', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Payroll' })).toHaveCount(0)
  })

  test('direct /payroll access is blocked', async ({ page }) => {
    await page.goto('/payroll')
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Current Payroll')).toHaveCount(0)
  })

  test('report profiles still hide compensation and payroll', async ({ page }) => {
    await page.goto('/people')
    await page.getByLabel('Search directory').fill('Mateusz')
    await page.getByRole('button', { name: /mateusz kowalski/i }).first().click()
    await expect(page).toHaveURL(/\/people\//)
    await page.getByRole('tab', { name: 'Payroll' }).click()
    await expect(page.getByText('No compensation record')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Latest payroll')).toHaveCount(0)
    await expect(page.getByText('Net pay')).toHaveCount(0)
  })
})
