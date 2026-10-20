import { NextResponse } from "next/server"
import { ensureDb, Notification } from "@/lib/database"
import { getSession } from "@/lib/auth"

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function GET() {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const unreadCount = await Notification.countDocuments({
    userId: session.user.id,
    readAt: null,
  }).exec()

  return NextResponse.json({ unreadCount })
}
