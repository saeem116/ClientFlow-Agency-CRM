import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { uploadAvatar, deleteFile, getUserAvatar, getClientOrThrow } from "@/lib/gridfs"
import { User } from "@/lib/database"

export async function POST(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const body = Buffer.from(bytes)

    const client = getClientOrThrow()
    const gridFsId = await uploadAvatar(client, body, {
      userId: session.user.id,
      organizationId: session.user.organizationId,
    })

    // Delete any previous avatar file before updating the reference so we
    // don't leave orphaned GridFS docs after replacement.
    const prevAvatarId = await getUserAvatar(client, session.user.id)
    if (prevAvatarId && prevAvatarId !== gridFsId) {
      try { await deleteFile(client, prevAvatarId, session.user.id, session.user.organizationId) } catch { /* already removed */ }
    }

    await User.findByIdAndUpdate(session.user.id, { avatar: gridFsId })

    return NextResponse.json({ success: true, avatarId: gridFsId })
  } catch (err) {
    if ((err as Error & { status?: number }).status === 400) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
    console.error("Avatar upload error:", err)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const client = getClientOrThrow()

  // Delete the user's current avatar file from GridFS (if any).
  // The fileId query param is deprecated; we look up by user instead.
  const avatarId = await getUserAvatar(client, session.user.id)
  if (avatarId) {
    try { await deleteFile(client, avatarId, session.user.id, session.user.organizationId) } catch { /* already removed */ }
  }

  // Clear the reference from the user document
  await User.findByIdAndUpdate(session.user.id, { avatar: null })

  return NextResponse.json({ success: true })
}

export async function GET(_request: NextRequest) {
  void _request
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const client = getClientOrThrow()
  const avatarId = await getUserAvatar(client, session.user.id)

  return NextResponse.json({ avatarId })
}
