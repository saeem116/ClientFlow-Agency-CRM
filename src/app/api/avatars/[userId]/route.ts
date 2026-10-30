import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { getClientOrThrow } from "@/lib/gridfs"
import { GridFSBucket, ObjectId } from "mongodb"

/**
 * GET /api/avatars/[userId]
 *
 * Serves the authenticated user's avatar (if any).
 *
 * Authorization: the requesting session must be authenticated, and the
 * avatar's owner must belong to the same organization as the requesting
 * user. A user can never retrieve another organization's avatars.
 *
 * The endpoint is NOT public: it requires a signed session cookie, so
 * `next/image` must be configured with `unoptimized` or the avatar must
 * be embedded inline where cookies are available.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  await ensureDb()

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // Use the user's `avatar` field directly — it is the authoritative
  // reference. getUserAvatar() queries GridFS by metadata and can return
  // orphaned files left over from previous uploads, which would show an
  // old image even after the user's avatar has been cleared.
  const { User } = await import("@/lib/database")
  const user = await User.findById(userId).lean() as unknown as {
    _id: { toString(): string }
    organizationId: { toString(): string } | null
    avatar: string | null
  } | null
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Tenant isolation: the avatar's owner must share an organization with
  // the requesting session. A user from Org A cannot fetch Org B's avatars.
  // The owner's organization is resolved through Membership (User has no
  // direct organizationId field).
  const { Membership } = await import("@/lib/database")
  const ownerMembership = await Membership.findOne({ userId: user._id.toString() }).lean() as unknown as { organizationId: { toString(): string } } | null
  const ownerOrgId = ownerMembership?.organizationId?.toString() || null
  if (!ownerOrgId || ownerOrgId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const avatarId = user.avatar || null
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
