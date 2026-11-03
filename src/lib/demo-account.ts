/**
 * Shared demo-account authorization helper.
 *
 * The public Vibe96 demo uses TWO demo accounts:
 *   - REVIEWER: reviewer@clientflow.test (MEMBER role, read-only)
 *   - ADMIN:    configured via DEMO_ADMIN_EMAIL (ADMIN role, full access)
 *
 * Both accounts authenticate against the isolated demo database (clientflow_demo).
 * The reviewer account is public and must never modify/delete shared demo data.
 * The admin account is for exploration of admin features and is configured per-deployment.
 *
 * This module is the single source of truth for "is this a demo account?" and
 * "which demo account is this?" so that:
 *   - Every write route can check the same rule without duplicating logic.
 *   - The check cannot be bypassed by forgetting it in one route.
 *   - The identities are configurable via env vars without touching code.
 *
 * The checks are EMAIL-BASED, matching how the app's own admin check works
 * (see `isAdminEmail` in lib/auth.ts). They are server-only: they read the
 * environment and compare normalized email strings.
 */

/** The env var that selects which account is the shared reviewer demo account. */
export const DEMO_ACCOUNT_EMAIL_ENV = "DEMO_ACCOUNT_EMAIL"

/** The default reviewer demo account email used when the env var is not set. */
export const DEFAULT_DEMO_ACCOUNT_EMAIL = "reviewer@clientflow.test"

/** The env var for the admin demo account email. */
export const DEMO_ADMIN_EMAIL_ENV = "DEMO_ADMIN_EMAIL"

/** The default admin demo account email used when the env var is not set. */
export const DEFAULT_DEMO_ADMIN_EMAIL = "admin@demo.test"

/**
 * Return the configured reviewer demo account email (lowercased, trimmed).
 *
 * When DEMO_ACCOUNT_EMAIL is not set, falls back to DEFAULT_DEMO_ACCOUNT_EMAIL
 * (reviewer@clientflow.test) so the public demo account is always available
 * without requiring per-deployment configuration. The env var can still
 * override the default for environments that need a different demo account.
 */
export function getDemoAccountEmail(): string {
  const raw = process.env[DEMO_ACCOUNT_EMAIL_ENV]
  if (raw) {
    const normalized = raw.trim().toLowerCase()
    if (normalized.length > 0) return normalized
  }
  return DEFAULT_DEMO_ACCOUNT_EMAIL
}

/**
 * Return the configured admin demo account email (lowercased, trimmed).
 *
 * When DEMO_ADMIN_EMAIL is not set, falls back to DEFAULT_DEMO_ADMIN_EMAIL
 * (admin@demo.test). This account must be explicitly provisioned in the
 * demo database before the admin demo login will work.
 */
export function getDemoAdminEmail(): string {
  const raw = process.env[DEMO_ADMIN_EMAIL_ENV]
  if (raw) {
    const normalized = raw.trim().toLowerCase()
    if (normalized.length > 0) return normalized
  }
  return DEFAULT_DEMO_ADMIN_EMAIL
}

/**
 * Determine whether the given email belongs to the shared reviewer demo account.
 *
 * Comparison is case-insensitive and trims whitespace to match the app's
 * own email normalization (User schema uses `lowercase: true, trim: true`).
 */
export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === getDemoAccountEmail()
}

/**
 * Determine whether the given email belongs to the admin demo account.
 *
 * Comparison is case-insensitive and trims whitespace to match the app's
 * own email normalization.
 */
export function isDemoAdminAccount(email: string | null | undefined): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === getDemoAdminEmail()
}

/**
 * Determine whether the given email belongs to ANY demo account
 * (reviewer or admin).
 */
export function isAnyDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return normalized === getDemoAccountEmail() || normalized === getDemoAdminEmail()
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
 * reviewer demo account. Returns silently otherwise.
 *
 * The admin demo account (isDemoAdminAccount) is allowed to perform writes.
 *
 * Use this at the top of every write handler so the guard is applied
 * uniformly and cannot be skipped by a route that forgets to check.
 */
export function requireNotDemoAccount(email: string | null | undefined): void {
  if (isDemoAccount(email)) {
    throw new DemoAccountReadOnlyError()
  }
}