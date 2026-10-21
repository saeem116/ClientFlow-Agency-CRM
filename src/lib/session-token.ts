/**
 * Pure session-token encoding/signing/decoding helpers.
 *
 * These are deliberately free of any Next.js or server-only imports so they can
 * be unit-tested in any environment. The actual session cookie is httpOnly and
 * is only ever read server-side (see `lib/auth.ts`); this module just owns the
 * token format shared between the auth API routes and `getSession()`.
 *
 * Token format: `<base64url(payload)>.<base64url(hmac-sha256)>`
 *
 * The payload is signed with AUTH_SECRET so that:
 *   - A token written by our own auth flow always verifies.
 *   - A forged or tampered token is rejected (signature mismatch).
 *   - The userId/organizationId embedded in the token cannot be modified
 *     without invalidating the signature.
 *
 * The signature is verified before the payload is trusted, so the DB lookups
 * in getSession() operate on authenticated data only.
 */

import { createHmac } from "node:crypto"

/** "production" = resolved from MONGODB_URI; "demo" = resolved from DEMO_MONGODB_URI */
type SessionContext = "production" | "demo"

export interface SessionPayload {
  userId: string
  organizationId: string
  /** Which database the session belongs to. Set on sign-in and verified on every request. */
  context: SessionContext
  timestamp: number
}

/** Default lifetime of a session cookie, matching the cookie `maxAge`. */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000 // 7 days

/**
 * Return the HMAC secret used to sign session tokens.
 *
 * Falls back to a dev-only default when AUTH_SECRET is unset in non-production
 * environments. In production, an unset AUTH_SECRET is a hard error because
 * unsigned tokens would allow session forgery.
 */
export function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not defined in environment variables")
  }
  // Dev fallback — never used in production.
  return "dev-secret-change-in-production"
}

/**
 * Sign a base64url-encoded payload string with HMAC-SHA256.
 */
function signData(data: string): string {
  return createHmac("sha256", getSessionSecret()).update(data).digest("base64url")
}

/**
 * Constant-time string comparison to mitigate timing attacks on signature
 * verification.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Encode a session payload into a signed URL-safe token.
 *
 * The returned string is `<base64url(payload)>.<base64url(signature)>` and is
 * the format written to the `session` cookie by the auth API routes.
 */
export function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = signData(data)
  return `${data}.${signature}`
}

/**
 * Decode and verify a session token.
 *
 * Accepts the signed format produced by `encodeSession`. Returns `null` for:
 *   - malformed tokens (not base64, wrong shape),
 *   - tokens whose signature does not match (forged/tampered),
 *   - payloads missing required fields.
 */
export function decodeSession(token: string): SessionPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 2) return null

    const [data, signature] = parts

    // Verify the signature before trusting the payload.
    const expected = signData(data)
    if (!constantTimeEqual(signature, expected)) return null

    let normalized = data.replace(/-/g, "+").replace(/_/g, "/")
    while (normalized.length % 4) {
      normalized += "="
    }
    const json = Buffer.from(normalized, "base64").toString("utf8")
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.userId !== "string" || typeof parsed.organizationId !== "string") return null
    if (typeof parsed.context !== "string" || !["production", "demo"].includes(parsed.context)) return null
    if (typeof parsed.timestamp !== "number") return null
    return parsed as SessionPayload
  } catch {
    return null
  }
}

/**
 * Returns true when the session payload has lived longer than `maxAgeMs`.
 * Used by `getSession()` to reject expired sessions even if the cookie is
 * still present (e.g. a stolen cookie, or a clock skew window).
 */
export function isSessionExpired(payload: SessionPayload, maxAgeMs: number = SESSION_MAX_AGE_MS): boolean {
  return Date.now() - payload.timestamp > maxAgeMs
}