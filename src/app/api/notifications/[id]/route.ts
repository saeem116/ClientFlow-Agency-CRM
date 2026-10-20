import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Notification } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * PATCH /api/notifications/:id
 * Marks a specific notification as read.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Find notification and verify it belongs to the current user
  const notification = await Notification.findOne({
    _id: id,
    userId: session.user.id,
  }).lean() as unknown as { _id: { toString(): string }; readAt?: Date; type: string; title: string; message: string; link?: string; createdAt: Date } | null

  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Mark as read if not already
  const updateData: Record<string, unknown> = {}
  if (!notification.readAt) {
    updateData.readAt = new Date()
  }

  if (Object.keys(updateData).length > 0) {
    await Notification.findByIdAndUpdate(id, updateData)
    revalidatePath("/dashboard")
    revalidatePath("/settings")
  }

  return NextResponse.json({ success: true })
}
