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
 * Face Attendance DEMO simulator checks. The run test uses 2026-07-01 —
 * a weekday BEFORE every seeded attendance window (seeds only move
 * forward), so the default latest-date view, dashboard rate and trend
 * are never affected. cleanup_e2e.sql removes simulator rows by marker.
 */

const DEMO_DATE = '2026-07-01'

test.describe('Face Attendance Demo — gating', () => {
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks — mobile responsiveness below')

  test.describe('HR admin', () => {
    test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

    test('hidden on normal /time-leave, visible with attendanceDemo=1', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.goto('/time-leave')
      await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Main Entrance Face Terminal')).toHaveCount(0)

      await page.goto('/time-leave?attendanceDemo=1')
      await expect(page.getByText('Main Entrance Face Terminal')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Demo Device')).toBeVisible()
      await expect(page.getByText('Auto Sync Enabled')).toBeVisible()
      await expect(page.getByRole('button', { name: /start live demo/i })).toBeVisible()
    })

    test('runs the live demo without touching existing records', async ({ page }) => {
      test.slow() // ~10s of sequential simulated events plus live queries
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.goto('/time-leave?attendanceDemo=1')
      await expect(page.getByRole('button', { name: /start live demo/i })).toBeVisible({ timeout: 15_000 })

      // Move to a date with no attendance so eligible employees exist.
      await page.getByLabel('Attendance date').fill(DEMO_DATE)
      await page.getByRole('button', { name: /start live demo/i }).click()

      // Events stream in and the workspace updates without a reload.
      await expect(page.getByText(/face detected|face verified/i).first()).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText(/demo complete/i)).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/5 employees verified/i)).toBeVisible()

      // Attendance table now shows the five simulator rows with the badge,
      // and summary counts reflect the 3 present / 2 late sequence.
      await expect(page.locator('table tbody tr')).toHaveCount(5, { timeout: 15_000 })
      await expect(page.getByText('Face Terminal', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('[DEMO_FACE_TERMINAL]')).toHaveCount(0)
    })
  })

  test.describe('Manager', () => {
    test.skip(!hasManagerCreds, 'Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD')

    test('never sees the simulator, even with the query parameter', async ({ page }) => {
      await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
      await page.goto('/time-leave?attendanceDemo=1')
      await expect(page.getByRole('heading', { name: 'Time & Leave' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Main Entrance Face Terminal')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /start live demo/i })).toHaveCount(0)
    })
  })
})

test.describe('Face Attendance Demo — mobile responsiveness', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test('panel stays responsive without horizontal overflow', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/time-leave?attendanceDemo=1')
    await expect(page.getByText('Main Entrance Face Terminal')).toBeVisible({ timeout: 15_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
