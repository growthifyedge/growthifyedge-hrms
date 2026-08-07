import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

test.describe('Routing', () => {
  test('unknown routes show a controlled state (never a broken screen)', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    // Anonymous users are redirected to login; signed-in users see Not Found.
    await expect(page.getByRole('heading', { name: /sign in|page not found/i })).toBeVisible()
  })

  test.describe('with live credentials', () => {
    test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

    test('deep link to /people survives refresh', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.goto('/people')
      await page.reload()
      await expect(page).toHaveURL(/\/people/)
      await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 15_000 })
    })

    test('unknown route shows Not Found for signed-in users', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.goto('/nope')
      await expect(page.getByText(/page not found/i)).toBeVisible()
    })

    test('authenticated users are redirected away from /login', async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
      await page.goto('/login')
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })
})
