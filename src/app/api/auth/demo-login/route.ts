import { NextRequest, NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/auth"
import { connectDemoDb } from "@/lib/demo-mongoose"
import { isDemoAccount } from "@/lib/demo-account"

/**
 * POST /api/auth/demo-login
 *
 * One-click demo login: signs in as a pre-configured demo persona.
 * Accepts only fixed persona identifiers — never arbitrary credentials.
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

    // Resolve demo users by email
    const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@demo.test"
    const memberEmail = process.env.DEMO_MEMBER_EMAIL || "member@demo.test"

    const targetEmail = persona === "admin" ? adminEmail : memberEmail

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