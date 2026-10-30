import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User, Membership } from "@/lib/database"
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
    // Escape regex metacharacters so the admin search box behaves as a
    // literal substring match rather than accepting a regex pattern.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    filter.$or = [
      { email: { $regex: escaped, $options: "i" } },
      { name: { $regex: escaped, $options: "i" } },
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

  // Fetch memberships for these users to show their organization roles
  const userIds = users.map((u: Record<string, unknown>) => (u._id as { toString(): string }).toString())
  const memberships = await Membership.find({ userId: { $in: userIds } }).lean().exec()

  // Group memberships by userId
  const membershipsByUser = new Map<string, Array<{ role: string; organizationId: string }>>()
  for (const m of memberships) {
    const uid = m.userId.toString()
    if (!membershipsByUser.has(uid)) membershipsByUser.set(uid, [])
    membershipsByUser.get(uid)!.push({ role: m.role, organizationId: m.organizationId.toString() })
  }

  const sanitized = users.map((u: Record<string, unknown>) => {
    const userId = (u._id as { toString(): string }).toString()
    const userMemberships = membershipsByUser.get(userId) || []
    return {
      id: userId,
      email: u.email as string,
      name: (u.name as string | null) ?? null,
      avatar: (u.avatar as string | null) ?? null,
      role: (u.role as string) ?? "MEMBER",
      organizationRoles: userMemberships.map(m => ({ role: m.role, organizationId: m.organizationId })),
      createdAt: (u.createdAt as Date).toISOString(),
      updatedAt: (u.updatedAt as Date).toISOString(),
    }
  })

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
