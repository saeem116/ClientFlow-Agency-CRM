import { NextRequest, NextResponse } from "next/server"
import { requireAuthSecret } from "./src/lib/session-secret"

const SESSION_COOKIE_NAME = "session"
const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000 // 7 days

/**
 * HMAC secret used to sign session tokens.
 *
 * Shared with `src/lib/session-token.ts` via the `session-secret` helper so
 * the Edge Runtime middleware and the Node.js auth layer always use the same
 * secret. There is no fallback: a missing AUTH_SECRET throws, which means an
 * unconfigured deployment cannot issue or accept session tokens.
 */
function getSessionSecret(): string {
  return requireAuthSecret()
}

/**
 * Sign a base64url-encoded payload string with HMAC-SHA256, returning
 * base64url (no padding) — identical to `signData()` in session-token.ts.
 *
 * Uses the Web Crypto API so this runs in the Edge Runtime.
 */
async function signData(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
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

interface VerifiedSession {
  userId: string
  organizationId: string
  context: "production" | "demo"
  timestamp: number
}

/**
 * Decode and verify a signed session token.
 *
 * Returns the payload only when the HMAC signature matches; any forged,
 * tampered, or malformed token yields `null`. This is the same verification
 * performed by `decodeSession()` in `src/lib/session-token.ts`, reimplemented
 * with Web Crypto for the Edge Runtime.
 */
async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 2) return null

    const [data, signature] = parts

    // Verify the signature before trusting the payload.
    const expected = await signData(data)
    if (!constantTimeEqual(signature, expected)) return null

    let normalized = data.replace(/-/g, "+").replace(/_/g, "/")
    while (normalized.length % 4) {
      normalized += "="
    }
    const json = atob(normalized)
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.userId !== "string" || typeof parsed.organizationId !== "string") return null
    if (typeof parsed.context !== "string" || !["production", "demo"].includes(parsed.context)) return null
    if (typeof parsed.timestamp !== "number") return null
    if (Date.now() - parsed.timestamp > SESSION_MAX_AGE_MS) return null
    return parsed as VerifiedSession
  } catch {
    return null
  }
}

/**
 * Middleware to protect /admin routes at the edge.
 *
 * This runs before the full page server-component execution, providing an
 * early denial for unauthenticated requests. The page and API route still
 * perform their own server-side checks as the authoritative gate — notably
 * the admin email check in `src/app/admin/users/page.tsx`, which this
 * middleware deliberately does NOT perform (the signed token carries no
 * email field, and verifying it requires a database lookup that the Edge
 * Runtime cannot do).
 */
export async function middleware(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin")

  if (!isAdminPath) {
    return NextResponse.next()
  }

  // Read the session cookie and verify the signed token at the edge.
  const cookieHeader = request.headers.get("cookie") || ""
  let sessionToken: string | null = null
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      sessionToken = trimmed.substring(`${SESSION_COOKIE_NAME}=`.length)
      break
    }
  }

  const session = sessionToken ? await verifySessionToken(sessionToken) : null

  if (!session) {
    // Not authenticated → redirect to sign-in
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  // Authenticated — let the page/API route perform the authoritative
  // admin-email check.
  return NextResponse.next()
}

/**
 * Only run middleware on admin routes.
 */
export const config = {
  matcher: ["/admin/:path*"],
}