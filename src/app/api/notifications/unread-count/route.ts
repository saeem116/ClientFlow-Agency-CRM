import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use the correct database context (demo vs production) based on the session
  const models = await getModels(session)
  const NotificationModel = models.Notification

  const unreadCount = await NotificationModel.countDocuments({
    userId: session.user.id,
    readAt: null,
  }).exec()

  return NextResponse.json({ unreadCount })
}
