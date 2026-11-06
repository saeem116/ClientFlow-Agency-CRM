import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Invitation } from "@/lib/database"
import { getSession, getOrgAdminSession } from "@/lib/auth"

interface InvitationLean {
  _id: { toString(): string }
  invitedById: { toString(): string }
}

/**
 * DELETE /api/invitations/:id
 * Revokes a pending invitation.
 *
 * Authorization: Organization admin (workspace-level ADMIN) or platform admin,
 * OR the original inviter.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()

  // Check if user is an org admin (allows any admin to revoke any invitation)
  const adminSession = await getOrgAdminSession()
  const isOrgAdmin = !!adminSession

  // Fallback to regular session for inviter check
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Authoritative tenant isolation: an invitation is only revocable by someone
  // in the same organization that owns it. This prevents a user from revoking
  // invitations belonging to another organization even if they know the ID.
  const invitation = await Invitation.findOne({ _id: id, organizationId: session.user.organizationId }).lean() as unknown as InvitationLean | null
  if (!invitation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Allow: org admin OR the original inviter
  const isInviter = invitation.invitedById.toString() === session.user.id

  if (!isOrgAdmin && !isInviter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await Invitation.findByIdAndUpdate(id, { status: "REVOKED" })

  return NextResponse.json({ success: true })
}