import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { getFileMetadata, getClientOrThrow } from "@/lib/gridfs"
import { ObjectId, GridFSBucket } from "mongodb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId } = await params
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 })
  }

  const client = getClientOrThrow()
  const metadata = await getFileMetadata(client, fileId)
  if (!metadata) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Verify ownership or allow within same org
  if (metadata.uploaderId !== session.user.id && metadata.organizationId !== session.user.organizationId) {
    const { Membership } = await import("@/lib/database")
    const membership = await Membership.findOne({
      userId: session.user.id,
      organizationId: metadata.organizationId,
    }).lean()
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const bucket = new GridFSBucket(client.db(), { bucketName: "files" })
  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId))

  const chunks: Buffer[] = []
  for await (const chunk of downloadStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const buffer = Buffer.concat(chunks)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": metadata.contentType,
      "Content-Disposition": `attachment; filename="${metadata.originalFilename}"`,
      "Content-Length": buffer.length.toString(),
    },
  })
}
