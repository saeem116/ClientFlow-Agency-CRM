import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User } from "@/lib/database"
import { getSession } from "@/lib/auth"

export async function PATCH(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { name?: unknown; avatar?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  // Whitelist only the fields we allow clients to update. `email`, `role`,
  // `password` and `organizationId` are never writable through this endpoint.
  const update: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name must be a string" },
        { status: 400 }
      )
    }
    const trimmed = body.name.trim()
    update.name = trimmed.length > 0 ? trimmed : null
  }

  if (body.avatar !== undefined) {
    if (body.avatar !== null && typeof body.avatar !== "string") {
      return NextResponse.json(
        { error: "Avatar must be a string or null" },
        { status: 400 }
      )
    }
    update.avatar = typeof body.avatar === "string" ? body.avatar.trim() || null : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    )
  }

  const updated = await User.findOneAndUpdate(
    { _id: session.user.id },
    { $set: update },
    { new: true, runValidators: true }
  )
    .select("-password")
    .lean() as unknown as {
      _id: { toString(): string }
      email: string
      name: string | null
      avatar: string | null
      role: string
    } | null

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: updated._id.toString(),
      email: updated.email,
      name: updated.name,
      avatar: updated.avatar,
      role: updated.role,
      organizationId: session.user.organizationId,
    },
  })
}