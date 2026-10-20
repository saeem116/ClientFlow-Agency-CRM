import { NextRequest, NextResponse } from "next/server"
import {
  ensureDb,
  Invitation,
  User,
  Membership,
  Organization,
} from "@/lib/database"
import { verifyToken } from "@/lib/mongoose/invitation"
import { createSession } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

interface InvitationLean {
  _id: { toString(): string }
  email: string
  role: string
  organizationId: { toString(): string }
  invitedById: { toString(): string }
  expiresAt: Date
  tokenHash: string
}

/**
 * POST /api/auth/accept-invitation
 *
 * Accepts an invitation by validating the token, creating/verifying the user,
 * and adding them to the organization.
 *
 * Security:
 * - Token is hashed and compared server-side
 * - Expiry is enforced
 * - Existing users are not overwritten
 * - New users are created with MEMBER role in the org
 */
export async function POST(request: NextRequest) {
  await ensureDb()

  const body = await request.json()
  const { token } = body

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    )
  }

  // Narrow lookup using the token prefix (first 8 chars)
  const tokenPrefix = token.substring(0, 8)

  const invitations = await Invitation.find({
    tokenPrefix,
    status: "PENDING",
  }).lean() as unknown as InvitationLean[]

  if (!invitations.length) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 400 }
    )
  }

  // Find the invitation whose hash matches the token
  let invitation: InvitationLean | null = null
  for (const inv of invitations) {
    if (await verifyToken(token, inv.tokenHash)) {
      invitation = inv
      break
    }
  }

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid invitation token" },
      { status: 400 }
    )
  }

  // Check expiry
  if (new Date(invitation.expiresAt) < new Date()) {
    await Invitation.findByIdAndUpdate(invitation._id, {
      status: "EXPIRED",
    })
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 410 }
    )
  }

  const email = invitation.email
  const role = invitation.role
  const organizationId = invitation.organizationId.toString()
  const invitedById = invitation.invitedById.toString()

  // Check if user already exists
  let user = await User.findOne({ email }).lean()

  if (user) {
    // User exists — check if already a member
    const existingMembership = await Membership.findOne({
      userId: (user as any)._id,
      organizationId,
    }).lean()

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 409 }
      )
    }

    // Add existing user to organization
    await Membership.create({
      userId: (user as any)._id,
      organizationId,
      role,
    })
  } else {
    // Create new user with no password (email-based auth only)
    user = await User.create({
      email: email.toLowerCase().trim(),
      name: null,
      avatar: null,
      role: "MEMBER",
      password: null,
    })

    // Create personal organization for the new user
    const personalOrg = await Organization.create({
      name: `${email.split("@")[0]}'s Workspace`,
      slug: `${email.split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
    })

    // Add user to the invited organization
    await Membership.create({
      userId: (user as any)._id,
      organizationId,
      role,
    })

    // Also create membership in their personal org
    await Membership.create({
      userId: (user as any)._id,
      organizationId: personalOrg._id,
      role: "ADMIN",
    })
  }

  // Mark invitation as accepted
  await Invitation.findByIdAndUpdate(invitation._id, {
    status: "ACCEPTED",
  })

  // Create session for the newly invited user
  await createSession((user as any)._id.toString(), organizationId)

  // Notify existing members of the organization
  const orgMembers = await Membership.find({ organizationId })
    .lean()
    .then((members) =>
      members.filter((m) => m.userId.toString() !== invitedById)
    )

  for (const member of orgMembers) {
    if (member.userId.toString() !== invitedById) {
      await createNotification({
        userId: member.userId.toString(),
        organizationId: organizationId,
        type: "member_joined",
        title: "New Team Member",
        message: `${email} has joined your organization`,
        link: `/settings?tab=team`,
      })
    }
  }

  return NextResponse.json({
    success: true,
    message: "Invitation accepted successfully",
    redirectUrl: "/dashboard",
  })
}