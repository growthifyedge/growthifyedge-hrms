import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

/**
 * Post-archive auth UX: forgot/reset/change password. These checks never
 * change any real password — the settings test only exercises client-side
 * validation, and the reset page is tested without a recovery session.
 */

test.describe('Password management UX', () => {
  test.skip(({ isMobile }) => !!isMobile, 'Desktop checks are sufficient')

  test('login offers a forgot-password link', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  })

  test('forgot password shows a neutral confirmation', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByLabel(/work email/i).fill('nobody.here@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    // Neutral response — must not reveal whether the account exists.
    await expect(page.getByText(/if an account exists/i)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('direct /reset-password visit never shows the password form', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: /reset link invalid or expired/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByLabel('New password')).toHaveCount(0)
    await expect(page.getByLabel('Confirm password')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /update password/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /request a new reset link/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible()
  })

  test('expired/malformed recovery links never show the password form', async ({ page }) => {
    await page.goto('/reset-password#error=access_denied&error_description=Email+link+is+invalid')
    await expect(page.getByRole('heading', { name: /reset link invalid or expired/i })).toBeVisible()
    await expect(page.getByLabel('New password')).toHaveCount(0)
    // A forged type=recovery hash without a real token must not unlock it either.
    await page.goto('/reset-password#access_token=forged&type=recovery')
    await expect(page.getByRole('heading', { name: /reset link invalid or expired/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByLabel('New password')).toHaveCount(0)
  })
})

test.describe('Reset page — normal authenticated session', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop check is sufficient')

  test('a signed-in session is not treated as password recovery', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: /reset link invalid or expired/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByLabel('New password')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /update password/i })).toHaveCount(0)
  })
})

test.describe('Change password (Settings → Security)', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop check is sufficient')

  test('section renders and validates without changing the demo password', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/settings')
    await page.getByRole('tab', { name: 'Security' }).click()
    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible()
    // Client-side validation only — never submit a valid change here.
    await page.getByLabel('New password').fill('Sunrise42')
    await page.getByLabel('Confirm password').fill('Different1')
    await page.getByRole('button', { name: /update password/i }).click()
    await expect(page.getByRole('alert')).toContainText(/do not match/i)
  })
})
