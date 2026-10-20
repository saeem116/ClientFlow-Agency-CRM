import { test, expect } from '@playwright/test'

/**
 * End-to-end tests for the authentication flow.
 *
 * These exercise the real server: the sign-in API route sets the httpOnly
 * session cookie, the client auth context re-validates it via /api/auth/me,
 * and the dashboard shell (sidebar) renders without a manual refresh.
 */
test.describe('authentication flow', () => {
  test('shows the sidebar immediately after sign-in without a refresh', async ({ page }) => {
    await page.goto('/sign-in')

    await page.getByLabel('Email Address').fill('admin@demo.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // After sign-in we should land on the dashboard. The sidebar should be
    // visible immediately — no manual refresh required.
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Dashboard').first()).toBeVisible()
    await expect(page.getByText('Clients').first()).toBeVisible()
    await expect(page.getByText('Settings').first()).toBeVisible()

    // The user's name should appear in the sidebar profile area.
    await expect(page.getByText('Admin User').first()).toBeVisible()
  })

  test('redirects unauthenticated users away from the dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/sign-in')
  })

  test('preserves the session across client-side navigation', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel('Email Address').fill('admin@demo.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page).toHaveURL('/dashboard')

    // Client-side navigation to /clients should keep the sidebar visible.
    await page.getByText('Clients').first().click()
    await expect(page).toHaveURL('/clients')
    await expect(page.getByText('Clients').first()).toBeVisible()

    // And back to /settings.
    await page.getByText('Settings').first().click()
    await expect(page).toHaveURL('/settings')
    await expect(page.getByText('Settings').first()).toBeVisible()
  })

  test('sign-out clears the session and returns to the sign-in page', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByLabel('Email Address').fill('admin@demo.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page).toHaveURL('/dashboard')

    // Open the user dropdown and sign out.
    await page.getByRole('button', { name: /Admin User/i }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL('/sign-in')

    // After sign-out, navigating to /dashboard should bounce back to sign-in.
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/sign-in')
  })

  test('legacy /login URL redirects to /sign-in', async ({ page }) => {
    const response = await page.goto('/login')
    // Should end up on the canonical sign-in page.
    await expect(page).toHaveURL('/sign-in')
  })
})