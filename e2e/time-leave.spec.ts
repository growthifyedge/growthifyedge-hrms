import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

/**
 * Targeted Wave 2 checks — HR admin Time & Leave flows.
 * Mutating tests only touch records they create themselves (Unpaid Leave,
 * far-future dates, reasons prefixed "E2E") so demo data stays pristine.
 */

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

async function openTimeLeave(page: Page) {
  await page.goto('/time-leave')
  await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
}

async function createUnpaidRequest(page: Page, reason: string, startOffset: number) {
  await page.getByRole('tab', { name: 'Leave' }).click()
  await page.getByRole('button', { name: /new request/i }).click()
  await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Elena Petrova (GE-1015)' })
  await page.getByLabel('Leave type').selectOption({ label: 'Unpaid Leave' })
  await page.getByLabel('Start date').fill(futureDate(startOffset))
  await page.getByLabel('End date').fill(futureDate(startOffset))
  await page.getByLabel('Reason').fill(reason)
  await page.getByRole('button', { name: /submit request/i }).click()
  await expect(page.getByText('Leave request submitted.')).toBeVisible({ timeout: 15_000 })
}

test.describe('HR admin — Time & Leave', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop flows — mobile essentials are covered below')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('attendance tab loads live data with summary cards', async ({ page }) => {
    await openTimeLeave(page)
    await expect(page.getByText('Attendance Rate')).toBeVisible()
    await expect(page.getByText('Present', { exact: true }).first()).toBeVisible()
    // Live rows in the table (employee codes are rendered per row).
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    // Deep-link refresh keeps the SPA route and data (hosted _redirects check).
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
  })

  test('attendance filters narrow and clear', async ({ page }) => {
    await openTimeLeave(page)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Filter by attendance status').selectOption('present')
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const statuses = await rows.locator('td:nth-child(4)').allInnerTexts()
    for (const s of statuses) expect(s.trim()).toBe('Present')
    await page.getByRole('button', { name: /clear filters/i }).click()
    await expect(page.getByLabel('Filter by attendance status')).toHaveValue('')
  })

  test('edit attendance opens the drawer and saves', async ({ page }) => {
    await openTimeLeave(page)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /edit attendance for/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Edit Attendance' })).toBeVisible()
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Attendance updated.')).toBeVisible({ timeout: 15_000 })
  })

  test('mark attendance detects an existing record for employee/day', async ({ page }) => {
    await openTimeLeave(page)
    await page.getByRole('button', { name: /mark attendance/i }).click()
    await expect(page.getByRole('heading', { name: 'Mark Attendance' })).toBeVisible()
    // Priya has seeded attendance on the prefilled (latest) date.
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Priya Sharma (GE-1008)' })
    await expect(
      page.getByText(/already exists for this employee and day/i),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('leave tab lists requests with summary cards', async ({ page }) => {
    await openTimeLeave(page)
    await page.getByRole('tab', { name: 'Leave' }).click()
    await expect(page.getByText('Pending Requests')).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Annual Leave').first()).toBeVisible()
  })

  test('create + approve a leave request', async ({ page }) => {
    await openTimeLeave(page)
    await createUnpaidRequest(page, 'E2E approval check', 40)
    await page.getByLabel('Filter by leave status').selectOption('pending')
    const row = page.locator('table tbody tr', { hasText: 'E2E approval check' }).first()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: /approve leave/i }).click()
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(page.getByText('Leave request approved.')).toBeVisible({ timeout: 15_000 })
  })

  test('create + reject a leave request with a note', async ({ page }) => {
    await openTimeLeave(page)
    await createUnpaidRequest(page, 'E2E rejection check', 45)
    await page.getByLabel('Filter by leave status').selectOption('pending')
    const row = page.locator('table tbody tr', { hasText: 'E2E rejection check' }).first()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: /reject leave/i }).click()
    await page.getByLabel(/review note/i).fill('Rejected by automated check.')
    await page.getByRole('button', { name: 'Reject', exact: true }).click()
    await expect(page.getByText('Leave request rejected.')).toBeVisible({ timeout: 15_000 })
  })

  test('leave balance blocks oversized paid requests', async ({ page }) => {
    await openTimeLeave(page)
    await page.getByRole('tab', { name: 'Leave' }).click()
    await page.getByRole('button', { name: /new request/i }).click()
    await page.getByRole('combobox', { name: /^employee/i }).selectOption({ label: 'Elena Petrova (GE-1015)' })
    await page.getByLabel('Leave type').selectOption({ label: 'Casual Leave' })
    await page.getByLabel('Start date').fill(futureDate(60))
    await page.getByLabel('End date').fill(futureDate(75)) // 16 days > 6-day entitlement
    await page.getByLabel('Reason').fill('E2E balance check')
    await page.getByRole('button', { name: /submit request/i }).click()
    await expect(page.getByText(/days? remaining for this leave type/i)).toBeVisible()
  })

  test('dashboard shows live Wave 2 metrics', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Attendance Rate')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/latest working day/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('On Leave Today')).toBeVisible()
    await expect(page.getByText('Attendance Trend')).toBeVisible()
    // The trend subtitle no longer references demo data.
    await expect(page.getByText('Recent working days', { exact: true })).toBeVisible()
  })

  test('employee profile attendance and leave tabs are live', async ({ page }) => {
    await page.goto('/people')
    await page.getByLabel('Search directory').fill('Priya')
    await page.getByRole('button', { name: /priya sharma/i }).first().click()
    await expect(page).toHaveURL(/\/people\//)
    await page.getByRole('tab', { name: 'Attendance' }).click()
    await expect(page.getByText('Attendance rate')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Recent attendance')).toBeVisible()
    await page.getByRole('tab', { name: 'Leave' }).click()
    await expect(page.getByText('Leave balances')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Annual Leave')).toBeVisible()
  })
})

test.describe('Time & Leave — mobile essentials', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('attendance cards render without horizontal overflow', async ({ page }) => {
    await page.goto('/time-leave')
    await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Attendance Rate')).toBeVisible()
    // Mobile card list (not the table) carries the records.
    await expect(page.locator('.md\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('leave cards render without horizontal overflow', async ({ page }) => {
    await page.goto('/time-leave')
    await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('tab', { name: 'Leave' }).click()
    await expect(page.getByText('Pending Requests')).toBeVisible()
    await expect(page.locator('.lg\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
