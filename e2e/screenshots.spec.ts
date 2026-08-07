import { test, expect } from '@playwright/test'
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
 * Captures showcase screenshots into ./screenshots (git-ignored).
 * Only runs when SCREENSHOTS=1 to keep normal test runs fast.
 */
const enabled = process.env.SCREENSHOTS === '1'

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

test.describe('Showcase screenshots', () => {
  test.skip(!enabled || !hasAdminCreds, 'Requires SCREENSHOTS=1 and admin credentials')
  test.describe.configure({ mode: 'serial' })

  test('admin screens', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize(DESKTOP)

    // 01 — Login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.screenshot({ path: 'screenshots/01-login-desktop.png', fullPage: true })

    // 02 — Dashboard desktop
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await expect(page.getByText('Workforce by Department')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500) // let charts finish animating
    await page.screenshot({ path: 'screenshots/02-dashboard-desktop.png', fullPage: true })

    // 03 — Dashboard mobile
    await page.setViewportSize(MOBILE)
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/03-dashboard-mobile.png', fullPage: true })

    // 04 — People desktop
    await page.setViewportSize(DESKTOP)
    await page.goto('/people')
    await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: 'screenshots/04-people-desktop.png', fullPage: true })

    // 05 — People mobile (card layout)
    await page.setViewportSize(MOBILE)
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/05-people-mobile.png', fullPage: true })

    // 06 — Employee profile
    await page.setViewportSize(DESKTOP)
    await page.getByLabel('Search directory').fill('Amara')
    await page.getByRole('button', { name: /amara okafor/i }).first().click()
    await expect(page.getByRole('heading', { name: /amara okafor/i })).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/06-employee-profile-desktop.png', fullPage: true })

    // 07 — Add Employee drawer
    await page.goto('/people')
    await page.getByRole('button', { name: /add employee/i }).first().click()
    await expect(page.getByRole('dialog', { name: /add employee/i })).toBeVisible()
    await page.screenshot({ path: 'screenshots/07-add-employee-drawer.png' })

    // 08 — Settings
    await page.goto('/settings')
    await expect(page.getByText('Organization profile')).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: 'screenshots/08-settings-desktop.png', fullPage: true })

    // 09 — Currency switched to PKR on dashboard
    await page.goto('/dashboard')
    await expect(page.getByText('Workforce by Department')).toBeVisible({ timeout: 20_000 })
    await page.getByLabel('Display currency').selectOption('PKR')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: 'screenshots/09-dashboard-pkr-currency.png', fullPage: true })
    await page.getByLabel('Display currency').selectOption('USD')
  })

  test('manager screens', async ({ page }) => {
    test.skip(!hasManagerCreds, 'Requires manager credentials')
    test.setTimeout(120_000)
    await page.setViewportSize(DESKTOP)

    // 10 — Manager dashboard (restricted)
    await signIn(page, MANAGER_EMAIL!, MANAGER_PASSWORD!)
    await expect(page.getByText(/team overview/i)).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'screenshots/10-manager-dashboard.png', fullPage: true })

    // 11 — Manager blocked from Settings
    await page.goto('/settings')
    await expect(page.getByText(/access restricted/i)).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: 'screenshots/11-manager-settings-denied.png' })

    // 12 — Manager scoped directory
    await page.goto('/people')
    await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: 'screenshots/12-manager-people-scoped.png', fullPage: true })
  })
})
