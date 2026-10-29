import { ensureDb } from "@/lib/database"
import { User, Membership } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { isAdminEmail } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminUsersPageClient } from "./admin-users-page-client"

/**
 * GET /admin/users
 *
 * Admin-only page to view all registered users.
 *
 * Server-side authorization enforces that only the user whose email matches
 * ADMIN_EMAIL can access this page. Unauthenticated visitors are redirected
 * to sign-in; unauthorized authenticated users receive a 403 response.
 */
export default async function AdminUsersPage() {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    redirect("/sign-in")
  }

  if (!await isAdminEmail(session.user.email)) {
    // Return a simple forbidden page rather than leaking the route exists.
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Access Denied
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  // Pre-fetch first page so the client component renders immediately.
  const page = 1
  const limit = 20
  const search = ""
  const skip = 0

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

  return (
    <AdminUsersPageClient
      initialUsers={sanitized}
      pagination={{
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }}
    />
  )
}
