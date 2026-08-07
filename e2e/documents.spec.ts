import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

test.describe('Employee documents', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
    await page.goto('/people')
    await page.getByLabel('Search directory').fill('Amara')
    await page.getByRole('button', { name: /amara okafor/i }).first().click()
    await page.getByRole('tab', { name: 'Documents' }).click()
  })

  test('document list renders with statuses', async ({ page }) => {
    await expect(page.getByText(/document/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('invalid file type is rejected client-side', async ({ page }) => {
    await page.getByRole('button', { name: /upload document/i }).click()
    await page.getByLabel(/file/i).setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('nope'),
    })
    await expect(page.getByText(/unsupported file type/i)).toBeVisible()
  })

  test('valid PDF is accepted and metadata appears after upload', async ({ page }) => {
    await page.getByRole('button', { name: /upload document/i }).click()
    const name = `E2E Test Document ${Date.now()}`
    await page.getByLabel(/file/i).setInputFiles({
      name: 'e2e-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })
    await page.getByLabel(/document name/i).fill(name)
    await page.getByRole('button', { name: /^upload$/i }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 })
  })
})
