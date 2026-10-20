import { NextResponse } from "next/server"
import { getCurrentUser, getOrganization } from "@/lib/auth"

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user AND their organization for the current
 * request, or `null` when there is no valid session.
 *
 * This is the ONLY endpoint the client calls to refresh its auth state. The
 * session cookie is httpOnly, so the client cannot read it; instead it asks
 * the server to validate the cookie and return the current user + org. This
 * keeps server-side session validation authoritative while letting the UI
 * update immediately after sign-in/sign-up without a full page reload.
 */
export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ user: null, org: null }, { status: 401 })
  }

  const org = await getOrganization()

  return NextResponse.json({
    user: session.user,
    org: org
      ? { id: org.id, name: org.name, slug: org.slug }
      : null,
  })
}