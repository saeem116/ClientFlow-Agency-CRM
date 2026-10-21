/**
 * Validation helpers for scripts/reset-demo-password.js.
 *
 * Extracted so they can be imported and unit-tested without importing the
 * script itself or connecting to MongoDB.
 */

/** Allowed hosts for scripts/reset-db.js. */
export const ALLOWED_RESET_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

/** Hard-coded target reviewer email. */
export const TARGET_EMAIL = "reviewer@clientflow.test"

/**
 * Parse the database name from a MongoDB URI.
 * Returns null if the URI is malformed or the db name cannot be extracted.
 */
export function parseDatabaseName(uri: string): string | null {
  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/)
  return match ? match[1] : null
}

/** Check whether a URI uses a supported MongoDB scheme. */
export function validateMongoScheme(uri: string): boolean {
  return /^mongodb(\+srv)?:\/\//i.test(uri)
}

/**
 * Extract the hostname portion from a MongoDB URI (the authority before `/`).
 * Returns null for URIs that don't contain an explicit `@` authority section
 * (e.g. bare `mongodb://localhost:27017/db`).
 */
export function extractHost(uri: string): string | null {
  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^@/]+@([^/]+)/)
  if (!match) return null
  return match[1].split(":")[0]
}

/**
 * Returns true when the URI points at a localhost-style host
 * (localhost, 127.0.0.1, ::1) — i.e. safe for destructive reset scripts.
 */
export function isLocalhostHost(uri: string): boolean {
  const host = extractHost(uri)
  if (host !== null) {
    return ALLOWED_RESET_DB_HOSTS.has(host)
  }
  // Handle bare URIs without explicit @ authority.
  // IPv6 form: mongodb://[::1]:27017/db
  const ipv6Match = uri.match(/mongodb(?:\+srv)?:\/\/\[([^\]]+)\]/)
  if (ipv6Match) return ALLOWED_RESET_DB_HOSTS.has(ipv6Match[1])
  // IPv4 / hostname form: mongodb://127.0.0.1:27017/db or mongodb://localhost/db
  const bareMatch = uri.match(/mongodb(?:\+srv)?:\/\/([^:/[\]]+)/)
  if (!bareMatch) return false
  return ALLOWED_RESET_DB_HOSTS.has(bareMatch[1])
}

/**
 * Returns true when the URI points at a remote host (not localhost).
 */
export function isRemoteHost(uri: string): boolean {
  return !isLocalhostHost(uri)
}

/**
 * Validate DEMO_ACCOUNT_EMAIL (if set) agrees with the hardcoded target email.
 */
export function validateTargetEmail(): { ok: boolean; error?: string } {
  const configured = process.env.DEMO_ACCOUNT_EMAIL?.trim().toLowerCase()
  if (configured && configured !== TARGET_EMAIL) {
    return {
      ok: false,
      error: `DEMO_ACCOUNT_EMAIL (${configured}) does not match the hardcoded target (${TARGET_EMAIL})`,
    }
  }
  return { ok: true }
}