/**
 * Shared demo-account authorization helper.
 *
 * The public Vibe96 demo uses ONE shared account (reviewer@clientflow.test)
 * that anyone can sign in with. Because the credentials are public, that
 * account must never be able to modify or delete shared demo data.
 *
 * This module is the single source of truth for "is this the demo account?"
 * so that:
 *   - Every write route can check the same rule without duplicating logic.
 *   - The check cannot be bypassed by forgetting it in one route.
 *   - The identity is configurable via DEMO_ACCOUNT_EMAIL without touching code.
 *
 * The check is EMAIL-BASED, matching how the app's own admin check works
 * (see `isAdminEmail` in lib/auth.ts). It is server-only: it reads the
 * environment and compares a normalized email string.
 */

/** The env var that selects which account is the shared demo account. */
export const DEMO_ACCOUNT_EMAIL_ENV = "DEMO_ACCOUNT_EMAIL"

/** The default demo account email used when the env var is not set. */
export const DEFAULT_DEMO_ACCOUNT_EMAIL = "reviewer@clientflow.test"

/**
 * Return the configured demo account email (lowercased, trimmed), or null
 * when demo-account protection is intentionally disabled.
 */
export function getDemoAccountEmail(): string | null {
  const raw = process.env[DEMO_ACCOUNT_EMAIL_ENV]
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

/**
 * Determine whether the given email belongs to the shared demo account.
 *
 * Comparison is case-insensitive and trims whitespace to match the app's
 * own email normalization (User schema uses `lowercase: true, trim: true`).
 */
export function isDemoAccount(email: string | null | undefined): boolean {
  const demoEmail = getDemoAccountEmail()
  if (!demoEmail) return false
  if (!email) return false
  return email.trim().toLowerCase() === demoEmail
}

/**
 * Throw a descriptive error when a write operation is attempted by the
 * shared demo account. Callers can catch this to return a 403.
 *
 * The error message is intentionally generic: it does not reveal whether
 * the demo account exists or what operations are blocked.
 */
export class DemoAccountReadOnlyError extends Error {
  constructor(message: string = "This account cannot perform this action") {
    super(message)
    this.name = "DemoAccountReadOnlyError"
  }
}

/**
 * Throw {@link DemoAccountReadOnlyError} when the given email is the shared
 * demo account. Returns silently otherwise.
 *
 * Use this at the top of every write handler so the guard is applied
 * uniformly and cannot be skipped by a route that forgets to check.
 */
export function requireNotDemoAccount(email: string | null | undefined): void {
  if (isDemoAccount(email)) {
    throw new DemoAccountReadOnlyError()
  }
}