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
 * Wave 2 manager scoping. The demo manager (Priya Sharma, GE-1008,
 * Engineering) has 12 direct reports; GE-1020 Ahmed Hassan reports to Sales
 * and must stay invisible.
 */

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

test.describe('Manager — Time & Leave scoping', () => {
  test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks are sufficient for scoping')

  test.beforeEach(async ({ page }) => {
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
  })

  test('attendance is view-only and scoped to the team', async ({ page }) => {
    await page.goto('/time-leave')
    await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
    // No admin actions anywhere.
    await expect(page.getByRole('button', { name: /mark attendance/i })).toHaveCount(0)
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /edit attendance/i })).toHaveCount(0)
    // Self + 12 direct reports at most.
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(13)
    // Only Engineering (or own) rows are visible.
    await expect(rows.filter({ hasText: 'Sales' })).toHaveCount(0)
  })

  test('leave list excludes unrelated employees', async ({ page }) => {
    await page.goto('/time-leave')
    await page.getByRole('tab', { name: 'Leave' }).click()
    await expect(page.getByText('Pending Requests')).toBeVisible({ timeout: 15_000 })
    // GE-1020 Ahmed Hassan (Sales) holds a seeded pending request the
    // manager must never see; no New Request button either.
    await expect(page.getByRole('button', { name: /new request/i })).toHaveCount(0)
    await page.getByLabel('Search leave requests').fill('Ahmed')
    await expect(page.locator('table tbody tr')).toHaveCount(0)
  })
})

test.describe('Manager — direct report approval', () => {
  test.skip(
    !hasManagerCreds || !hasAdminCreds,
    'Requires both admin and manager E2E credentials',
  )
  test.skip(({ isMobile }) => !!isMobile, 'Desktop check is sufficient')

  test('manager approves a pending request from a direct report', async ({ page }) => {
    // HR admin files a fresh unpaid request for a direct report (GE-1009),
    // so this test never consumes the seeded demo data.
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/time-leave')
    await page.getByRole('tab', { name: 'Leave' }).click()
    await page.getByRole('button', { name: /new request/i }).click()
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Mateusz Kowalski (GE-1009)' })
    await page.getByLabel('Leave type').selectOption({ label: 'Unpaid Leave' })
    await page.getByLabel('Start date').fill(futureDate(50))
    await page.getByLabel('End date').fill(futureDate(50))
    await page.getByLabel('Reason').fill('E2E manager approval')
    await page.getByRole('button', { name: /submit request/i }).click()
    await expect(page.getByText('Leave request submitted.')).toBeVisible({ timeout: 15_000 })

    // Switch to the manager: drop the stored session and sign in fresh
    // (deterministic — avoids racing the account-menu dropdown).
    await page.evaluate(() => window.localStorage.clear())
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
    await page.goto('/time-leave')
    await page.getByRole('tab', { name: 'Leave' }).click()
    await page.getByLabel('Filter by leave status').selectOption('pending')
    const row = page.locator('table tbody tr', { hasText: 'E2E manager approval' }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /approve leave/i }).click()
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(page.getByText('Leave request approved.')).toBeVisible({ timeout: 15_000 })
  })
})
