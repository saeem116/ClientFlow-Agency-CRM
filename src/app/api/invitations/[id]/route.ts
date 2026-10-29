import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Invitation } from "@/lib/database"
import { getSession } from "@/lib/auth"

interface InvitationLean {
  _id: { toString(): string }
  invitedById: { toString(): string }
}

/**
 * DELETE /api/invitations/:id
 * Revokes a pending invitation.
 *
 * Security: Only the invitation creator or an ADMIN can revoke.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()

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

  // Only the inviter can revoke
  const isInviter = invitation.invitedById.toString() === session.user.id

  if (!isInviter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await Invitation.findByIdAndUpdate(id, { status: "REVOKED" })

  return NextResponse.json({ success: true })
}