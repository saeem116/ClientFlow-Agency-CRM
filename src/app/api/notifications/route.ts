import { NextRequest, NextResponse } from "next/server"
import { ensureDb, Notification } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user.
 */
export async function GET(request: NextRequest) {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  // Fetch user's notifications with pagination
  const [notifications, total] = await Promise.all([
    Notification.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Notification.countDocuments({ userId: session.user.id }).exec(),
  ])

  // Count unread
  const unreadCount = await Notification.countDocuments({
    userId: session.user.id,
    readAt: null,
  }).exec()

  // Serialize notifications
  const serialized = notifications.map((n: Record<string, unknown>) => ({
    id: (n._id as { toString(): string }).toString(),
    type: n.type as string,
    title: n.title as string,
    message: (n.message as string | null) ?? null,
    link: (n.link as string | null) ?? null,
    read: !!n.readAt,
    readAt: n.readAt ? (n.readAt as Date).toISOString() : null,
    createdAt: (n.createdAt as Date).toISOString(),
  }))

  return NextResponse.json({
    notifications: serialized,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications as read for the authenticated user.
 */
export async function POST(request: NextRequest) {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = await request.json() as { action?: string }

  if (action === "markAllRead") {
    // Mark all unread notifications as read
    await Notification.updateMany(
      { userId: session.user.id, readAt: null },
      { readAt: new Date() }
    )

    revalidatePath("/dashboard")
    revalidatePath("/settings")

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
