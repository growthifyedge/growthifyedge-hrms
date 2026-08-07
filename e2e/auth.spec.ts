import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

test.describe('Authentication', () => {
  test('login page renders with demo access details', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText(/demo access/i)).toBeVisible()
    await expect(page.getByLabel(/work email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('protected route redirects anonymous users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('root redirects anonymous users to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test.describe('with live credentials', () => {
    test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

    test('valid user signs in and reaches the dashboard', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      // Title settles to "Executive Overview" once the profile has loaded.
      await expect(page.getByText(/executive overview/i)).toBeVisible({ timeout: 15_000 })
    })

    test('session persists after refresh', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.reload()
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('logout returns to login', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.getByRole('button', { name: /account menu/i }).click()
      await page.getByRole('menuitem', { name: /sign out/i }).click()
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    })

    test('invalid credentials show friendly error', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/work email/i).fill(ADMIN_EMAIL!)
      await page.getByLabel(/password/i).fill('definitely-wrong-password')
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page.getByRole('alert')).toContainText(/incorrect email or password/i)
    })
  })
})
