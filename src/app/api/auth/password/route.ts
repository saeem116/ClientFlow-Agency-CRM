import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User } from "@/lib/database"
import { getSession, requireOrg } from "@/lib/auth"
import { hashPassword, verifyPassword } from "@/lib/bcrypt"

/**
 * PATCH /api/auth/password
 *
 * Changes the authenticated user's password.
 *
 * Security:
 *   - Requires a valid, signed session. The user identity is derived from
 *     the session cookie, NEVER from the request body, so one user cannot
 *     change another's password.
 *   - The current password must be supplied and verified against the stored
 *     bcrypt hash before any change takes place.
 *   - The new password is hashed with the same cost factor (12) used by the
 *     sign-up flow. No plaintext password is ever stored or returned.
 *   - The shared demo account is blocked by requireOrg() (it throws
 *     DemoAccountReadOnlyError), matching every other write route.
 */
export async function PATCH(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Shared demo account may view profile but may never modify it.
  try {
    requireOrg()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: {
    currentPassword?: unknown
    newPassword?: unknown
    confirmPassword?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  const { currentPassword, newPassword, confirmPassword } = body

  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json(
      { error: "Current password is required" },
      { status: 400 }
    )
  }

  if (typeof newPassword !== "string" || !newPassword) {
    return NextResponse.json(
      { error: "New password is required" },
      { status: 400 }
    )
  }

  if (typeof confirmPassword !== "string" || !confirmPassword) {
    return NextResponse.json(
      { error: "Please confirm your new password" },
      { status: 400 }
    )
  }

  // Enforce the same password policy as the sign-up flow.
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 }
    )
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation do not match" },
      { status: 400 }
    )
  }

  // Reject setting the password to the same value. bcrypt comparison is
  // expensive, so only run it when the new password differs from the current
  // one — but we still need the current-password verification below regardless.
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password" },
      { status: 400 }
    )
  }

  // Fetch the authoritative record and verify the current password. We scope
  // the lookup to the session user id so the body cannot redirect the change.
  const user = await User.findById(session.user.id)
    .select("+password")
    .lean() as unknown as {
      _id: { toString(): string }
      password: string | null
    } | null

  if (!user || !user.password) {
    return NextResponse.json(
      { error: "Current password is required" },
      { status: 400 }
    )
  }

  const isValidCurrent = await verifyPassword(currentPassword, user.password)
  if (!isValidCurrent) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    )
  }

  const hashedPassword = await hashPassword(newPassword)

  await User.findByIdAndUpdate(session.user.id, {
    $set: { password: hashedPassword },
  })

  return NextResponse.json({ success: true })
}