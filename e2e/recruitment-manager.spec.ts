import { expect, test } from '@playwright/test'
import { MANAGER_EMAIL, MANAGER_PASSWORD, hasManagerCreds, signIn } from './helpers'

/**
 * Wave 3 manager scoping. The demo manager (Priya Sharma, GE-1008) is the
 * hiring manager for the Senior Software Engineer and Software Engineer
 * openings only — Sales/Marketing/Finance/HR candidates must stay hidden,
 * and everything is view-only.
 */

test.describe('Manager — Recruitment scoping', () => {
  test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks are sufficient for scoping')

  test.beforeEach(async ({ page }) => {
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
    await page.goto('/recruitment')
    await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible({ timeout: 15_000 })
  })

  test('jobs are visible but read-only', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /new job/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /edit job/i })).toHaveCount(0)
  })

  test('candidates are scoped to own jobs and view-only', async ({ page }) => {
    await page.getByRole('tab', { name: 'Candidates' }).click()
    await expect(page.getByRole('button', { name: /add candidate/i })).toHaveCount(0)
    // Own-job candidate (Senior Software Engineer, hiring manager = Priya).
    const ownCard = page.locator('button', { hasText: 'Viktor Hansen' }).first()
    await expect(ownCard).toBeVisible({ timeout: 15_000 })
    // Unrelated hiring manager's candidate (Account Executive, Sales).
    await expect(page.locator('button', { hasText: 'Gabriela Santos' })).toHaveCount(0)
    // Drawer opens without any stage controls or hire action.
    await ownCard.click()
    await expect(page.getByRole('heading', { name: 'Viktor Hansen' })).toBeVisible()
    await expect(page.getByText('Move stage')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /hire candidate/i })).toHaveCount(0)
  })

  test('onboarding shows direct reports, view-only', async ({ page }) => {
    await page.getByRole('tab', { name: 'Onboarding' }).click()
    await expect(page.getByText('Average Progress')).toBeVisible({ timeout: 15_000 })
    // Hana (GE-1017) reports to Priya and is mid-onboarding in the seed.
    const row = page.locator('table tbody tr', { hasText: 'GE-1017' }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click()
    await expect(page.getByRole('heading', { name: /onboarding — hana/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^complete task/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^reopen task/i })).toHaveCount(0)
  })
})
