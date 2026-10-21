import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Invitation, Membership, Organization } from "@/lib/database"
import { getSession, isAdminEmail, requireOrg } from "@/lib/auth"
import { generateTokenPair } from "@/lib/mongoose/invitation"
import { sendInvitationEmail } from "@/lib/email"

/**
 * GET /api/invitations
 * Returns pending invitations for the current user's organization.
 */
export async function GET() {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only configured admin email can manage invitations
  if (!await isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const memberships = await Membership.find({ userId: session.user.id }).lean()
  if (!memberships.length) {
    return NextResponse.json({ invitations: [] })
  }

  const orgId = memberships[0].organizationId.toString()

  const invitations = await Invitation.find({
    organizationId: orgId,
    status: "PENDING",
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  // Fetch org and inviter names for display
  const org = await Organization.findById(orgId).lean() as unknown as { name: string } | null
  const orgName = org?.name || "Workspace"

  const serialized = invitations.map((inv: Record<string, unknown>) => ({
    id: (inv._id as { toString(): string }).toString(),
    email: inv.email as string,
    role: inv.role as string,
    invitedBy: inv.invitedById?.toString() || "",
    status: inv.status as string,
    expiresAt: (inv.expiresAt as Date).toISOString(),
    createdAt: (inv.createdAt as Date).toISOString(),
    orgName,
  }))

  return NextResponse.json({ invitations: serialized })
}

/**
 * POST /api/invitations
 * Creates a new invitation and sends an email.
 *
 * Security:
 * - Only ADMIN users can invite
 * - Token is hashed before storage
 * - Email is sent server-side only
 * - Duplicates are prevented
 */
export async function POST(request: NextRequest) {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Shared demo account may view invitations but may never create them.
  try {
    requireOrg()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Verify inviter is ADMIN (by email match)
  if (!await isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { email, role } = body

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    )
  }

  const validRoles = ["ADMIN", "MEMBER", "CLIENT"]
  const normalizedRole = (role || "MEMBER").toUpperCase()
  if (!validRoles.includes(normalizedRole)) {
    return NextResponse.json(
      { error: "Invalid role. Must be ADMIN, MEMBER, or CLIENT" },
      { status: 400 }
    )
  }

  // Get organization
  const memberships = await Membership.find({ userId: session.user.id }).lean()
  if (!memberships.length) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 }
    )
  }
  const orgId = memberships[0].organizationId.toString()
  const org = await Organization.findById(orgId).lean() as unknown as { name: string } | null
  const orgName = org?.name || "ClientFlow"

  // Check for duplicate pending invitation
  const existing = await Invitation.findOne({
    email: email.toLowerCase().trim(),
    organizationId: orgId,
    status: "PENDING",
  }).lean()

  if (existing) {
    return NextResponse.json(
      { error: "An active invitation already exists for this email" },
      { status: 409 }
    )
  }

  // Also check if the email is already a member
  const User = (await import("@/lib/database")).User
  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
  }).lean()

  if (existingUser) {
    const existingMembership = await Membership.findOne({
      userId: String((existingUser as Record<string, unknown>)._id),
      organizationId: orgId,
    }).lean()

    if (existingMembership) {
      return NextResponse.json(
        { error: "This email is already a member of your organization" },
        { status: 409 }
      )
    }
  }

  // Generate secure token
  const { token, tokenHash, tokenPrefix } = await generateTokenPair()

  // Set expiry to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Create invitation record
  const invitation = await Invitation.create({
    email: email.toLowerCase().trim(),
    role: normalizedRole as "ADMIN" | "MEMBER" | "CLIENT",
    organizationId: orgId,
    invitedById: session.user.id,
    tokenHash,
    tokenPrefix,
    expiresAt,
    status: "PENDING",
  })

  // Build acceptance link using the app's base URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const acceptLink = `${appUrl}/accept-invitation?token=${token}`

  // Send email
  const from = process.env.EMAIL_FROM || "noreply@clientflow.com"
  const inviterName = session.user.name || session.user.email || "Administrator"

  const emailResult = await sendInvitationEmail({
    to: email.toLowerCase().trim(),
    from,
    orgName,
    inviterName,
    acceptLink,
    recipientEmail: email.toLowerCase().trim(),
  })

  if (emailResult.success) {
    return NextResponse.json({
      success: true,
      invitationId: invitation._id.toString(),
      message: `Invitation sent to ${invitation.email}`,
    })
  }

  // Email failed but invitation is saved — allow the user to retry
  console.error(
    `[invitation] Email failed for ${invitation.email}: ${emailResult.error}`
  )
  return NextResponse.json(
    {
      success: false,
      error: emailResult.error || "Failed to send invitation",
      invitationId: invitation._id.toString(),
    },
    { status: 502 }
  )
}