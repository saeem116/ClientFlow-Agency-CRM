import { NextRequest, NextResponse } from "next/server"
import { getSession, isAdminEmail } from "./src/lib/auth"

/**
 * Middleware to protect /admin routes at the edge.
 *
 * This runs before the full page server-component execution, providing an
 * early denial for unauthorized requests. The page and API route still
 * perform their own server-side checks as the authoritative gate.
 */
export async function middleware(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin")

  if (!isAdminPath) {
    return NextResponse.next()
  }

  // Get the session cookie and validate it server-side
  const session = await getSession()

  if (!session) {
    // Not authenticated → redirect to sign-in
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (!await isAdminEmail(session.user.email)) {
    // Authenticated but not the configured admin → forbidden
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Admin access granted — continue to the page
  return NextResponse.next()
}

/**
 * Only run middleware on admin routes.
 */
export const config = {
  matcher: ["/admin/:path*"],
}
