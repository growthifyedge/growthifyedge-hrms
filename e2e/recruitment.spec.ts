import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD, hasAdminCreds, signIn } from './helpers'

/**
 * Targeted Wave 3 checks — HR admin recruitment flows.
 * Tests in this file run in order (single worker per file) and share one
 * run-scoped candidate identity, so reruns never collide. Everything the
 * suite creates is "E2E"-prefixed for cleanup_e2e.sql.
 */

const RUN_TAG = Date.now().toString().slice(-6)
const RUN_EMAIL = `e2e.cand.${RUN_TAG}@example.com`
const RUN_CODE = `E2E-${RUN_TAG}`
const CANDIDATE_NAME = 'E2E Candidate'

function futureDateTime(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return `${d.toISOString().slice(0, 10)}T14:00`
}

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

async function openRecruitment(page: Page) {
  await page.goto('/recruitment')
  await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible({ timeout: 15_000 })
}

async function openRunCandidate(page: Page) {
  await page.getByRole('tab', { name: 'Candidates' }).click()
  await page.getByLabel('Search candidates').fill(RUN_EMAIL)
  const card = page.locator('button', { hasText: RUN_EMAIL }).first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  await card.click()
}

test.describe('HR admin — Recruitment', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !!isMobile, 'Desktop flows — mobile essentials are covered below')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('jobs tab loads with stats and seeded openings', async ({ page }) => {
    await openRecruitment(page)
    await expect(page.getByText('Open Positions')).toBeVisible()
    await expect(page.getByText('Total Candidates')).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Senior Software Engineer').first()).toBeVisible()
  })

  test('create and edit a job opening', async ({ page }) => {
    await openRecruitment(page)
    await page.getByRole('button', { name: /new job/i }).click()
    await page.getByLabel('Job title').fill(`E2E Test Job ${RUN_TAG}`)
    await page.getByLabel('Department').selectOption({ label: 'Engineering' })
    await page.getByLabel('Location').selectOption({ label: 'Karachi HQ — Karachi' })
    await page.getByRole('combobox', { name: /^hiring manager/i }).selectOption({ label: 'Priya Sharma (GE-1008)' })
    await page.getByRole('button', { name: /create job/i }).click()
    await expect(page.getByText('Job opening created.')).toBeVisible({ timeout: 15_000 })

    // Edit it: park it as Draft so it never pollutes the open-jobs demo view.
    const row = page.locator('table tbody tr', { hasText: `E2E Test Job ${RUN_TAG}` }).first()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: /edit job/i }).click()
    await page.getByLabel('Number of openings').fill('2')
    await page.getByLabel('Status').selectOption('draft')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Job updated.')).toBeVisible({ timeout: 15_000 })
  })

  test('candidate pipeline board shows all six stages with seeded cards', async ({ page }) => {
    await openRecruitment(page)
    await page.getByRole('tab', { name: 'Candidates' }).click()
    for (const stage of ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']) {
      await expect(page.getByRole('heading', { name: stage, exact: true })).toBeVisible()
    }
    await expect(page.locator('button', { hasText: 'Viktor Hansen' }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('add a candidate into Applied', async ({ page }) => {
    await openRecruitment(page)
    await page.getByRole('tab', { name: 'Candidates' }).click()
    await page.getByRole('button', { name: /add candidate/i }).click()
    await page.getByLabel('Full name').fill(CANDIDATE_NAME)
    await page.getByLabel('Email').fill(RUN_EMAIL)
    await page.getByLabel('Job opening').selectOption({ label: 'Content Strategist — Marketing' })
    await page.getByLabel('Source').selectOption('Referral')
    await page.getByRole('button', { name: /add candidate/i }).last().click()
    await expect(page.getByText('Candidate added to the pipeline.')).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('Search candidates').fill(RUN_EMAIL)
    await expect(page.locator('button', { hasText: RUN_EMAIL }).first()).toBeVisible()
  })

  test('move candidate to screening, then interview with details', async ({ page }) => {
    await openRecruitment(page)
    await openRunCandidate(page)
    await page.getByLabel('New stage').selectOption('screening')
    await page.getByRole('button', { name: /move candidate/i }).click()
    await expect(page.getByText('Moved to Screening.')).toBeVisible({ timeout: 15_000 })

    await openRunCandidate(page)
    await page.getByLabel('New stage').selectOption('interview')
    await page.getByLabel('Interview date & time').fill(futureDateTime(3))
    await page.getByLabel('Interviewer').selectOption({ label: 'Zainab Malik (GE-1025)' })
    await page.getByLabel('Interview note').fill('E2E portfolio review')
    await page.getByRole('button', { name: /move candidate/i }).click()
    await expect(page.getByText('Moved to Interview.')).toBeVisible({ timeout: 15_000 })
  })

  test('extend an offer, hire, and land on the new employee profile', async ({ page }) => {
    await openRecruitment(page)
    await openRunCandidate(page)
    await page.getByLabel('New stage').selectOption('offer')
    await page.getByLabel(/proposed salary/i).fill('4500')
    await page.getByRole('button', { name: /move candidate/i }).click()
    await expect(page.getByText('Moved to Offer.')).toBeVisible({ timeout: 15_000 })

    await openRunCandidate(page)
    await page.getByRole('button', { name: /hire candidate/i }).click()
    await page.getByLabel('Employee code').fill(RUN_CODE)
    await page.getByRole('combobox', { name: /^manager/i }).selectOption({ label: 'Zainab Malik (GE-1025)' })
    await page.getByLabel('Joining date').fill(futureDate(14))
    await page.getByRole('button', { name: /hire & start onboarding/i }).click()
    await expect(page.getByText(/hired — onboarding started/i)).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/people\//, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: CANDIDATE_NAME })).toBeVisible({ timeout: 15_000 })
  })

  test('hired employee appears in onboarding; complete a task', async ({ page }) => {
    await openRecruitment(page)
    await page.getByRole('tab', { name: 'Onboarding' }).click()
    await expect(page.getByText('Average Progress')).toBeVisible()
    const row = page.locator('table tbody tr', { hasText: RUN_CODE }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row.getByText('0 / 6')).toBeVisible()
    await row.click()
    await expect(page.getByRole('heading', { name: `Onboarding — ${CANDIDATE_NAME}` })).toBeVisible()
    await page.getByRole('button', { name: /^complete task/i }).first().click()
    await expect(page.getByText('17%').first()).toBeVisible({ timeout: 15_000 })
  })

  test('dashboard recruitment metrics are live', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Open Vacancies')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/across \d+ open role/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Live candidate stages')).toBeVisible()
    await expect(page.getByText('Leave, interviews and offers')).toBeVisible()
  })
})

test.describe('Recruitment — mobile essentials', () => {
  test.skip(!hasAdminCreds, 'Requires E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD')
  test.skip(({ isMobile }) => !isMobile, 'Mobile project only')

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  })

  test('jobs and candidates render without horizontal overflow', async ({ page }) => {
    await page.goto('/recruitment')
    await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Open Positions')).toBeVisible()
    // Jobs render as cards on mobile.
    await expect(page.locator('.md\\:hidden .rounded-xl').first()).toBeVisible({ timeout: 15_000 })
    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    // Candidates use the stage selector, not a six-column board.
    await page.getByRole('tab', { name: 'Candidates' }).click()
    await expect(page.getByLabel('Select pipeline stage')).toBeVisible()
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    // Onboarding cards.
    await page.getByRole('tab', { name: 'Onboarding' }).click()
    await expect(page.getByText('Average Progress')).toBeVisible()
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
