import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { isAdminEmail } from "@/lib/auth"

/**
 * GET /api/admin/users
 *
 * Returns a paginated, searchable list of all registered users.
 *
 * Authorization: the authenticated session's email must match ADMIN_EMAIL.
 * The check is enforced server-side; the client cannot falsify it.
 */
export async function GET(request: NextRequest) {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!await isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const search = (searchParams.get("q") || "").trim()

  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = {}
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ]
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    User.countDocuments(filter).exec(),
  ])

  const sanitized = users.map((u: Record<string, unknown>) => ({
    id: (u._id as { toString(): string }).toString(),
    email: u.email as string,
    name: (u.name as string | null) ?? null,
    avatar: (u.avatar as string | null) ?? null,
    role: (u.role as string) ?? "MEMBER",
    createdAt: (u.createdAt as Date).toISOString(),
    updatedAt: (u.updatedAt as Date).toISOString(),
  }))

  return NextResponse.json({
    users: sanitized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
