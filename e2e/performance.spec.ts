import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

/**
 * Targeted Wave 4 checks — HR admin performance flows.
 * Tests run in file order and share one run-scoped identity. Everything
 * created here is "E2E"-prefixed (goal titles, cycle names) so
 * cleanup_e2e.sql can purge it; seeded demo data is never mutated.
 */

const RUN_TAG = Date.now().toString().slice(-6)
const GOAL_TITLE = `E2E Goal ${RUN_TAG}`
const CYCLE_NAME = `E2E Cycle ${RUN_TAG}`

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

async function openPerformance(page: Page) {
  await page.goto('/performance')
  await expect(page.getByRole('heading', { name: 'Performance' })).toBeVisible({ timeout: 15_000 })
}

test.describe('HR admin — Performance', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop flows — mobile essentials are covered below')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('performance page loads with stats and seeded goals', async ({ page }) => {
    await openPerformance(page)
    await expect(page.getByText('Active Goals')).toBeVisible()
    await expect(page.getByText('Average Rating')).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Cut API p95 latency by 30%').first()).toBeVisible()
  })

  test('create a goal, then update its progress', async ({ page }) => {
    await openPerformance(page)
    await page.getByRole('button', { name: /new goal/i }).click()
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Elena Petrova (GE-1015)' })
    await page.getByLabel('Goal title').fill(GOAL_TITLE)
    await page.getByLabel('Category').selectOption('development')
    await page.getByLabel('Start date').fill(futureDate(-10))
    await page.getByLabel('Target date').fill(futureDate(60))
    await page.getByLabel('Status', { exact: true }).selectOption('in_progress')
    await page.getByLabel('Progress (%)').fill('20')
    await page.getByRole('button', { name: /create goal/i }).click()
    await expect(page.getByText('Goal created.')).toBeVisible({ timeout: 15_000 })

    // Update progress.
    await page.getByLabel('Search goals').fill(GOAL_TITLE)
    await page.getByRole('button', { name: `Edit goal ${GOAL_TITLE}` }).click()
    await page.getByLabel('Progress (%)').fill('60')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Goal updated.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('60%').first()).toBeVisible()
  })

  test('reviews tab shows seeded reviews and distribution', async ({ page }) => {
    await openPerformance(page)
    await page.getByRole('tab', { name: 'Reviews' }).click()
    await expect(page.getByText('Rating distribution')).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Q1 2026 Performance Review').first()).toBeVisible()
  })

  test('create cycle + review, complete it, rating calculated as 4.5', async ({ page }) => {
    await openPerformance(page)
    await page.getByRole('tab', { name: 'Reviews' }).click()

    // Fresh active cycle keeps reruns collision-free (unique employee+cycle).
    await page.getByRole('button', { name: /new cycle/i }).click()
    await page.getByLabel('Cycle name').fill(CYCLE_NAME)
    await page.getByLabel('Start date').fill(futureDate(-5))
    await page.getByLabel('End date').fill(futureDate(30))
    await page.getByRole('button', { name: /create cycle/i }).click()
    await expect(page.getByText('Review cycle created.')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /new review/i }).click()
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Elena Petrova (GE-1015)' })
    await page.getByLabel('Review cycle').selectOption({ label: CYCLE_NAME })
    await page.getByRole('button', { name: /create review/i }).click()
    await expect(page.getByText('Review created — it is now pending.')).toBeVisible({ timeout: 15_000 })

    // Complete it: (4+4+5+5)/4 = 4.5 → Exceptional.
    await page.getByLabel('Filter by review cycle').selectOption({ label: CYCLE_NAME })
    const row = page.locator('table tbody tr', { hasText: 'Elena' }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /open review/i }).click()
    await page.getByLabel('Goal Achievement').selectOption('4')
    await page.getByLabel('Quality of Work').selectOption('4')
    await page.getByLabel('Collaboration').selectOption('5')
    await page.getByLabel('Initiative').selectOption('5')
    await page.getByLabel('Strengths').fill('E2E automated review note.')
    await expect(page.getByText('Overall:')).toBeVisible()
    await page.getByRole('button', { name: /complete review/i }).click()
    await expect(page.getByText('Review completed.')).toBeVisible({ timeout: 15_000 })
    await expect(row.getByText('4.5')).toBeVisible({ timeout: 15_000 })
  })

  test('employee profile performance tab is live', async ({ page }) => {
    await page.goto('/people')
    await page.getByLabel('Search directory').fill('Chen')
    await page.getByRole('button', { name: /chen wei/i }).first().click()
    await expect(page).toHaveURL(/\/people\//)
    await page.getByRole('tab', { name: 'Performance' }).click()
    await expect(page.getByText('Goals', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Latest review')).toBeVisible()
    await expect(page.getByText(/Exceptional|Exceeds Expectations|Meets Expectations/).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('dashboard shows reviews due', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Leave, recruitment and reviews')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/review due —/i).first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Performance — mobile essentials', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('goals and reviews render without horizontal overflow', async ({ page }) => {
    await page.goto('/performance')
    await expect(page.getByRole('heading', { name: 'Performance' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Active Goals')).toBeVisible()
    await expect(page.locator('.md\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.getByRole('tab', { name: 'Reviews' }).click()
    await expect(page.getByText('Rating distribution')).toBeVisible()
    await expect(page.locator('.lg\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
