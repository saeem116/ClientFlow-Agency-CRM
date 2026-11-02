import { NextRequest, NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/auth"
import { connectDemoDb } from "@/lib/demo-mongoose"
import { isDemoAccount, getDemoAccountEmail } from "@/lib/demo-account"

/**
 * POST /api/auth/demo-login
 *
 * One-click demo login: signs in as a pre-configured demo persona.
 * Accepts only fixed persona identifiers — never arbitrary credentials.
 *
 * Persona mapping:
 *   - "member" → DEMO_MEMBER_EMAIL, falling back to the shared demo account
 *     (reviewer@clientflow.test, role MEMBER). This is the only demo account
 *     that exists by default.
 *   - "admin"  → DEMO_ADMIN_EMAIL. Requires explicit provisioning; there is
 *     no admin demo account by default, so this persona returns 503 until the
 *     env var is set. This prevents a button that falsely advertises a role
 *     the demo does not actually have.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { persona } = body

    // Validate persona is one of the allowed values
    if (!persona || !["admin", "member"].includes(persona)) {
      return NextResponse.json(
        { error: "Invalid persona. Must be 'admin' or 'member'." },
        { status: 400 }
      )
    }

    // Check if already logged in
    const existingSession = await getSession()
    if (existingSession) {
      return NextResponse.json({
        user: existingSession.user,
        isDemo: existingSession.isDemo,
      })
    }

    // Connect to demo database
    const demoMongoose = await connectDemoDb()
    if (!demoMongoose) {
      return NextResponse.json(
        { error: "Demo database not configured." },
        { status: 503 }
      )
    }

    const { User: DemoUser, Membership: DemoMembership } = await import("@/lib/database-demo")
    const UserModel = await DemoUser()
    const MemModel = await DemoMembership()

    // Resolve demo users by email.
    // The "member" persona maps to the shared demo account by default so the
    // one-click button works out of the box. The "admin" persona requires an
    // explicitly provisioned account (DEMO_ADMIN_EMAIL) — there is no admin
    // demo account by default, and we will not fabricate one.
    const adminEmail = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase() || null
    const memberEmail = (
      process.env.DEMO_MEMBER_EMAIL?.trim().toLowerCase() ||
      getDemoAccountEmail()
    )

    const targetEmail = persona === "admin" ? adminEmail : memberEmail

    if (!targetEmail) {
      return NextResponse.json(
        {
          error: `Demo ${persona} account is not configured. ` +
            `Set DEMO_ADMIN_EMAIL to enable admin demo login.`,
        },
        { status: 503 }
      )
    }

    // Verify the target account is actually a demo account
    if (!isDemoAccount(targetEmail)) {
      return NextResponse.json(
        { error: "Target account is not a demo account." },
        { status: 500 }
      )
    }

    // Find the user
    const user = await UserModel.findOne({ email: targetEmail }).lean() as unknown as {
      _id: { toString(): string }
      email: string
      name: string | null
      avatar: string | null
      role: string
    } | null

    if (!user) {
      return NextResponse.json(
        { error: `Demo ${persona} account not found. Please seed the demo database first.` },
        { status: 404 }
      )
    }

    // Get membership to verify organization access
    const membership = await MemModel.findOne({
      userId: user._id.toString(),
    }).lean() as unknown as {
      role: string
      organizationId: { toString(): string }
    } | null

    if (!membership) {
      return NextResponse.json(
        { error: "Demo user has no organization." },
        { status: 500 }
      )
    }

    // Create session with demo context
    await createSession(user._id.toString(), membership.organizationId.toString(), "demo")

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationRole: membership.role,
        organizationId: membership.organizationId.toString(),
      },
      isDemo: true,
    })
  } catch (error) {
    console.error("[demo-login] Error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "An error occurred during demo login." },
      { status: 500 }
    )
  }
}