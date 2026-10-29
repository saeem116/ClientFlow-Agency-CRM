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
import { requireAuthSecret } from "./session-secret"

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
 * There is no fallback. An unset or too-short AUTH_SECRET throws immediately,
 * so a missing configuration can never result in tokens being signed or
 * accepted with an insecure default secret. See {@link requireAuthSecret}.
 */
export function getSessionSecret(): string {
  return requireAuthSecret()
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
    // Reject payloads whose IDs are not valid ObjectId strings. A malformed
    // value (e.g. "[object Object]" from a populated-doc toString() bug) must
    // never reach Mongoose — it would throw a CastError during SSR.
    if (!isValidObjectId(parsed.userId) || !isValidObjectId(parsed.organizationId)) return null
    if (typeof parsed.context !== "string" || !["production", "demo"].includes(parsed.context)) return null
    if (typeof parsed.timestamp !== "number") return null
    return parsed as SessionPayload
  } catch {
    return null
  }
}

/**
 * Strict ObjectId format check: 24 hexadecimal characters.
 *
 * This matches the MongoDB ObjectId wire format and is consistent with the
 * ObjectId field types used across every Mongoose schema in this project
 * (Membership.organizationId, User._id, etc.).
 *
 * Used to reject malformed session payloads — e.g. `organizationId:
 * "[object Object]"` — BEFORE they reach Mongoose, where a CastError would
 * surface during server-side rendering. A non-24-hex string is never a valid
 * ObjectId and is therefore never safe to pass to a Mongoose query.
 */
export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_HEX_RE.test(id)
}

const OBJECT_ID_HEX_RE = /^[0-9a-fA-F]{24}$/

/**
 * Returns true when the session payload has lived longer than `maxAgeMs`.
 * Used by `getSession()` to reject expired sessions even if the cookie is
 * still present (e.g. a stolen cookie, or a clock skew window).
 */
export function isSessionExpired(payload: SessionPayload, maxAgeMs: number = SESSION_MAX_AGE_MS): boolean {
  return Date.now() - payload.timestamp > maxAgeMs
}