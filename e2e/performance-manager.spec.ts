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
 * Wave 4 manager scoping. The demo manager (Priya Sharma, GE-1008,
 * Engineering) sees only her own and her direct reports' performance data.
 * Mutations are "E2E"-prefixed and rerun-safe (fresh cycle per run).
 */

const RUN_TAG = Date.now().toString().slice(-6)
const TEAM_GOAL = `E2E Team Goal ${RUN_TAG}`
const MGR_CYCLE = `E2E MGR Cycle ${RUN_TAG}`

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

test.describe('Manager — Performance scoping', () => {
  test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks are sufficient for scoping')

  test.beforeEach(async ({ page }) => {
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
    await page.goto('/performance')
    await expect(page.getByRole('heading', { name: 'Performance' })).toBeVisible({ timeout: 15_000 })
  })

  test('sees team goals only; unrelated employees hidden', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    // Direct report's goal (Mateusz, Engineering) is visible.
    await expect(page.getByText('Cut API p95 latency by 30%').first()).toBeVisible()
    // Marketing goal (Thomas Müller — Zainab's report) must be invisible.
    await page.getByLabel('Search goals').fill('campaign')
    await expect(page.locator('table tbody tr')).toHaveCount(0)
    // Reviews are scoped the same way.
    await page.getByRole('tab', { name: 'Reviews' }).click()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table tbody tr', { hasText: 'Aisha' })).toHaveCount(0)
  })

  test('creates and edits a goal for a direct report', async ({ page }) => {
    test.slow() // create + edit round-trip against live Supabase
    await page.getByRole('button', { name: /new goal/i }).click()
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Mateusz Kowalski (GE-1009)' })
    await page.getByLabel('Goal title').fill(TEAM_GOAL)
    await page.getByRole('combobox', { name: /^category$/i }).selectOption('project')
    await page.getByLabel('Start date').fill(futureDate(0))
    await page.getByLabel('Target date').fill(futureDate(45))
    await page.getByRole('combobox', { name: /^status$/i }).selectOption('in_progress')
    await page.getByLabel('Progress (%)').fill('10')
    await page.getByRole('button', { name: /create goal/i }).click()
    await expect(page.getByText('Goal created.')).toBeVisible({ timeout: 15_000 })
    // Toasts overlay the drawer footer buttons — dismiss deterministically.
    await page.getByRole('button', { name: 'Dismiss notification' }).first().click().catch(() => {})
    await expect(page.getByText('Goal created.')).toBeHidden({ timeout: 10_000 })

    await page.getByLabel('Search goals').fill(TEAM_GOAL)
    await page.getByRole('button', { name: `Edit goal ${TEAM_GOAL}` }).click()
    await page.getByLabel('Progress (%)').fill('50')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Goal updated.')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Manager — direct report review completion', () => {
  test.skip(!hasManagerCreds || !hasAdminCreds, 'Requires both admin and manager E2E credentials')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop check is sufficient')

  test('manager completes a direct-report review created by HR', async ({ page }) => {
    // Admin sets up a fresh cycle + pending review for GE-1009 (rerun-safe).
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/performance')
    await page.getByRole('tab', { name: 'Reviews' }).click()
    await page.getByRole('button', { name: /new cycle/i }).click()
    await page.getByLabel('Cycle name').fill(MGR_CYCLE)
    await page.getByLabel('Start date').fill(futureDate(-3))
    await page.getByLabel('End date').fill(futureDate(30))
    await page.getByRole('button', { name: /create cycle/i }).click()
    await expect(page.getByText('Review cycle created.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Review cycle created.')).toBeHidden({ timeout: 10_000 })
    await page.getByRole('button', { name: /new review/i }).click()
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Mateusz Kowalski (GE-1009)' })
    await page.getByRole('combobox', { name: /^review cycle$/i }).selectOption({ label: MGR_CYCLE })
    await page.getByRole('button', { name: /create review/i }).click()
    await expect(page.getByText('Review created — it is now pending.')).toBeVisible({ timeout: 15_000 })

    // Switch to the manager and complete exactly that review.
    await page.evaluate(() => window.localStorage.clear())
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
    await page.goto('/performance')
    await page.getByRole('tab', { name: 'Reviews' }).click()
    await page.getByLabel('Filter by review cycle').selectOption({ label: MGR_CYCLE })
    const row = page.locator('table tbody tr', { hasText: 'Mateusz' }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /open review/i }).click()
    await page.getByLabel('Goal Achievement').selectOption('4')
    await page.getByLabel('Quality of Work').selectOption('4')
    await page.getByLabel('Collaboration').selectOption('4')
    await page.getByLabel('Initiative').selectOption('4')
    await page.getByRole('button', { name: /complete review/i }).click()
    await expect(page.getByText('Review completed.')).toBeVisible({ timeout: 15_000 })
    await expect(row.getByText('4.0')).toBeVisible({ timeout: 15_000 })
  })
})
