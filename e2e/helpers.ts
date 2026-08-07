import { expect, type Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.E2E_HR_ADMIN_EMAIL
export const ADMIN_PASSWORD = process.env.E2E_HR_ADMIN_PASSWORD
export const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL
export const MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD

export const hasAdminCreds = !!(ADMIN_EMAIL && ADMIN_PASSWORD)
export const hasManagerCreds = !!(MANAGER_EMAIL && MANAGER_PASSWORD)

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/work email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}
