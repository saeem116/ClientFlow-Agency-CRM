import { NextRequest, NextResponse } from "next/server"
import { ensureDb } from "@/lib/database"
import { getSession, requireOrg } from "@/lib/auth"
import { uploadFile, getFileMetadata, listFiles, deleteFile, getClientOrThrow } from "@/lib/gridfs"
import { File as FileModel } from "@/lib/database"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Shared demo account may browse files but may never upload new ones.
  try {
    requireOrg()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    const originalFilename = (formData.get("filename") as string) || file.name
    const clientId = formData.get("clientId") as string | null
    const projectId = formData.get("projectId") as string | null

    const bytes = await file.arrayBuffer()
    const body = Buffer.from(bytes)

    const client = getClientOrThrow()
    const fileRecord = await uploadFile(client, body, {
      originalFilename,
      contentType: file.type,
      userId: session.user.id,
      organizationId: session.user.organizationId,
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
    })

    // Create MongoDB metadata record
    const mongoFile = await FileModel.create({
      fileId: fileRecord.fileId,
      originalFilename: fileRecord.originalFilename,
      contentType: fileRecord.contentType,
      size: fileRecord.size,
      uploaderId: session.user.id,
      organizationId: session.user.organizationId,
      clientId: clientId ? new ObjectId(clientId) : null,
      projectId: projectId ? new ObjectId(projectId) : null,
    })

    return NextResponse.json({
      id: mongoFile._id.toString(),
      fileId: fileRecord.fileId,
      originalFilename: fileRecord.originalFilename,
      contentType: fileRecord.contentType,
      size: fileRecord.size,
      createdAt: fileRecord.createdAt,
    })
  } catch (err) {
    if ((err as Error & { status?: number }).status === 400) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
    console.error("File upload error:", err)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get("clientId")
  const projectId = searchParams.get("projectId")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  const client = getClientOrThrow()
  const { files } = await listFiles(client, {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    ...(clientId ? { clientId } : {}),
    ...(projectId ? { projectId } : {}),
    page,
    limit,
  })

  // Enrich with MongoDB metadata
  const fileIds = files.map((f) => f.fileId)
  const dbFiles = await FileModel.find({ fileId: { $in: fileIds } }).lean()
  const dbFileMap = new Map(dbFiles.map((f) => [f.fileId, f]))

  return NextResponse.json({
    files: files.map((f) => ({
      ...f,
      id: dbFileMap.get(f.fileId)?._id?.toString() || f.fileId,
    })),
    total: files.length,
  })
}

export async function DELETE(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 })
  }

  const client = getClientOrThrow()

  // Verify ownership
  const metadata = await getFileMetadata(client, fileId)
  if (!metadata || metadata.uploaderId !== session.user.id || metadata.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete from GridFS
  await deleteFile(client, fileId, session.user.id, session.user.organizationId)

  // Delete from MongoDB
  await FileModel.deleteOne({ fileId })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  await ensureDb()
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 })
  }

  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const client = getClientOrThrow()
  const metadata = await getFileMetadata(client, fileId)
  if (!metadata || metadata.uploaderId !== session.user.id || metadata.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 })
    }
    await FileModel.findOneAndUpdate(
      { fileId },
      { originalFilename: body.name.trim() }
    )
  }

  return NextResponse.json({ success: true })
}
