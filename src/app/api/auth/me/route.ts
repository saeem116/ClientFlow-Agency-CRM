import { NextResponse } from "next/server"
import { getCurrentUser, getOrganization } from "@/lib/auth"

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user AND their organization for the current
 * request, or `null` when there is no valid session.
 * Also returns `isDemo` to indicate whether this session belongs to the
 * shared public demo account (reviewer@clientflow.test).
 */
export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ user: null, org: null, isDemo: false }, { status: 401 })
  }

  const org = await getOrganization()

  return NextResponse.json({
    user: session.user,
    org: org
      ? { id: org.id, name: org.name, slug: org.slug }
      : null,
    isDemo: session.isDemo,
  })
}
