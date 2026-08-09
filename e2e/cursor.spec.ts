import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

/**
 * Custom cursor checks (read-only). Desktop Chromium reports a fine
 * pointer, so the cursor activates; the Pixel 7 project emulates touch,
 * so it must stay fully native there.
 */

test.describe('Custom cursor — desktop', () => {
  test.skip(({ isMobile }) => !!isMobile, 'Desktop-only feature')

  test('login page hides the native cursor and reacts to hover', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-cursor-ring]')).toBeAttached()
    const active = await page.evaluate(() =>
      document.documentElement.classList.contains('custom-cursor'),
    )
    expect(active).toBe(true)
    const signIn = page.getByRole('button', { name: /^sign in$/i })
    await expect(signIn).toHaveCSS('cursor', 'none')
    await signIn.hover()
    await expect(page.locator('[data-cursor-ring]')).toHaveAttribute('data-state', 'interactive')
    // Text fields keep the native caret and hide the custom cursor.
    const email = page.getByLabel(/work email/i)
    await expect(email).toHaveCSS('cursor', 'text')
    await email.hover()
    await expect(page.locator('[data-cursor-ring]')).toHaveAttribute('data-state', 'hidden')
  })

  test.describe('authenticated surfaces', () => {
    test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

    test('sidebar links and clickable table rows read as interactive', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.getByRole('link', { name: 'People', exact: true }).hover()
      await expect(page.locator('[data-cursor-ring]')).toHaveAttribute('data-state', 'interactive')
      await page.goto('/people')
      const row = page.locator('table tbody tr').first()
      await expect(row).toBeVisible({ timeout: 15_000 })
      await row.hover()
      await expect(page.locator('[data-cursor-ring]')).toHaveAttribute('data-state', 'interactive')
      // Settings: selects/inputs stay native-cursor zones.
      await page.goto('/settings')
      const orgName = page.getByLabel(/organization name/i).first()
      if (await orgName.count()) {
        await orgName.hover()
        await expect(page.locator('[data-cursor-ring]')).toHaveAttribute('data-state', 'hidden')
      }
    })
  })
})

test.describe('Custom cursor — touch devices stay native', () => {
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test('no custom cursor on coarse-pointer devices', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    const state = await page.evaluate(() => ({
      htmlClass: document.documentElement.classList.contains('custom-cursor'),
      dotDisplay: getComputedStyle(document.querySelector('[data-cursor-dot]')!).display,
    }))
    expect(state.htmlClass).toBe(false)
    expect(state.dotDisplay).toBe('none')
  })
})
