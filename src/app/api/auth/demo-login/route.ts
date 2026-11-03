import { NextRequest, NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/auth"
import { connectDemoDb } from "@/lib/demo-mongoose"
import { getDemoAccountEmail, getDemoAdminEmail, isAnyDemoAccount } from "@/lib/demo-account"

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
 *
 * Rate limiting: basic in-memory store (resets on deploy). In production,
 * consider using a Redis-backed store for distributed rate limiting.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // max 10 attempts per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many demo login attempts. Please wait a moment and try again." },
        { status: 429 }
      )
    }

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
    const adminEmail = getDemoAdminEmail()
    const memberEmail = getDemoAccountEmail() // DEMO_MEMBER_EMAIL falls back to reviewer

    const targetEmail = persona === "admin" ? adminEmail : memberEmail

    // Verify the target account is a configured demo account
    if (!isAnyDemoAccount(targetEmail)) {
      return NextResponse.json(
        { error: `Demo ${persona} account is not configured.` },
        { status: 503 }
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
        { error: "Demo admin account not found. Please provision the demo database first." },
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

    // Verify the admin persona gets an ADMIN role membership
    if (persona === "admin" && membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Demo admin account does not have ADMIN role." },
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