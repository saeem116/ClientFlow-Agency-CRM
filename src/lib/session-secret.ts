/**
 * Shared session-signing secret validation.
 *
 * Both the Node.js auth layer (`lib/session-token.ts`) and the Edge Runtime
 * middleware (`middleware.ts`) sign and verify session tokens with HMAC-SHA256.
 * They must use the same secret, and that secret must never fall back to an
 * insecure default — a fallback would let anyone who knows the default forge
 * valid session tokens.
 *
 * This module is the single source of truth for "is AUTH_SECRET configured?".
 * It is intentionally free of server-only imports so it can be imported from
 * both the Edge Runtime middleware and the Node.js session-token module.
 *
 * The secret is validated lazily — at the moment an authentication operation
 * needs it — rather than at module load time. That keeps the Next.js build
 * (which does not have runtime env vars for every deployment target) from
 * failing merely because a runtime-only variable is absent during compilation.
 * A request that reaches signing/verification without a configured secret
 * fails closed with a clear error.
 */

/** The env var that must be set in every deployment to sign session tokens. */
export const AUTH_SECRET_ENV = "AUTH_SECRET"

/**
 * Minimum acceptable length for AUTH_SECRET, in characters.
 *
 * A 32-byte random value hex-encoded is 64 characters. We enforce a floor so
 * that a manually-typed secret of, say, 48 hex chars still passes, while a
 * trivially short placeholder like "secret" is rejected.
 */
export const MIN_SECRET_LENGTH = 32

/**
 * Return the configured AUTH_SECRET, or null when it is unset/empty.
 *
 * Note: this does NOT throw. Callers decide what to do — fail closed, or
 * (in tests) substitute a known value.
 */
export function getAuthSecret(): string | null {
  const secret = process.env[AUTH_SECRET_ENV]
  if (!secret) return null
  const trimmed = secret.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Return the configured AUTH_SECRET or throw if it is missing or too short.
 *
 * This is the fail-closed entry point used by every code path that signs or
 * verifies an authentication token. It must never silently substitute a
 * default secret.
 */
export function requireAuthSecret(): string {
  const secret = getAuthSecret()
  if (!secret) {
    throw new Error(
      `${AUTH_SECRET_ENV} is not defined in environment variables. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    )
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${AUTH_SECRET_ENV} is too short (${secret.length} chars). ` +
        `Generate a 64-character hex secret with: ` +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    )
  }
  return secret
}
