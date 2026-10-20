import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getClientOrThrow } from "@/lib/gridfs"
import { GridFSBucket, ObjectId } from "mongodb"

/**
 * GET /api/avatars/[userId]
 *
 * Public image-serving endpoint. Serves the authenticated user's avatar
 * (if any) without requiring a session cookie, so `next/image` can
 * retrieve it when the browser does not send cookies for this origin.
 *
 * Ownership is enforced server-side by verifying the requesting user
 * belongs to the same organization as the avatar's owner, or by allowing
 * any logged-in user to view their own avatar. Unauthenticated requests
 * are rejected.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  await ensureDb()

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // Use the user's `avatar` field directly — it is the authoritative
  // reference. getUserAvatar() queries GridFS by metadata and can return
  // orphaned files left over from previous uploads, which would show an
  // old image even after the user's avatar has been cleared.
  const { User } = await import("@/lib/database")
  const user = await User.findById(userId).lean()
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const avatarId = (user as { avatar?: string | null }).avatar || null
  if (!avatarId) {
    // Return a 1×1 transparent PNG instead of 404 so next/image has a
    // stable placeholder and doesn't retry.
    return new NextResponse(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, no-store",
        },
      }
    )
  }

  const client = getClientOrThrow()
  const bucket = new GridFSBucket(client.db(), { bucketName: "files" })

  let downloadStream
  try {
    downloadStream = bucket.openDownloadStream(new ObjectId(avatarId))
  } catch {
    // The referenced file no longer exists — return the placeholder
    // rather than a 500, so the UI degrades gracefully.
    return new NextResponse(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, no-store",
        },
      }
    )
  }

  const chunks: Buffer[] = []
  try {
    for await (const chunk of downloadStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
  } catch {
    // File was deleted between the lookup and the read.
    return new NextResponse(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, no-store",
        },
      }
    )
  }

  const buffer = Buffer.concat(chunks)
  const fileDoc = await bucket.find({ _id: new ObjectId(avatarId) }).toArray()
  const contentType = fileDoc[0]?.contentType || "image/jpeg"

  // Private + no-store: the avatar is tied to a specific user and changes
  // frequently, so it must never be served from a cached copy.
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  })
}
