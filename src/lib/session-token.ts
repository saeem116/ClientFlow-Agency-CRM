/**
 * Pure session-token encoding/decoding helpers.
 *
 * These are deliberately free of any Next.js or server-only imports so they can
 * be unit-tested in any environment. The actual session cookie is httpOnly and
 * is only ever read server-side (see `lib/auth.ts`); this module just owns the
 * token format shared between the auth API routes and `getSession()`.
 */

export interface SessionPayload {
  userId: string
  organizationId: string
  timestamp: number
}

/** Default lifetime of a session cookie, matching the cookie `maxAge`. */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000 // 7 days

/**
 * Encode a session payload into a URL-safe base64 token (no padding).
 * This is the format written to the `session` cookie by the auth API routes.
 */
export function encodeSession(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

/**
 * Decode a session token back into a payload.
 * Accepts both URL-safe (base64url) and standard base64 input and restores
 * padding automatically. Returns `null` for any malformed or shape-invalid token.
 */
export function decodeSession(token: string): SessionPayload | null {
  try {
    let normalized = token.replace(/-/g, "+").replace(/_/g, "/")
    while (normalized.length % 4) {
      normalized += "="
    }
    const json = Buffer.from(normalized, "base64").toString("utf8")
    const data = JSON.parse(json)
    if (!data || typeof data !== "object") return null
    if (typeof data.userId !== "string" || typeof data.organizationId !== "string") return null
    if (typeof data.timestamp !== "number") return null
    return data as SessionPayload
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