import { GridFSBucket, type MongoClient, ObjectId } from "mongodb"
import mongoose from "mongoose"
import { randomUUID } from "node:crypto"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-rar-compressed",
])

function getGridFS(client: MongoClient): GridFSBucket {
  return new GridFSBucket(client.db(), { bucketName: "files" })
}

export interface FileRecord {
  fileId: string
  originalFilename: string
  contentType: string
  size: number
  uploaderId: string
  organizationId: string
  categoryId: string | null
  clientId: string | null
  projectId: string | null
  createdAt: Date
}

interface GridFSDoc {
  _id: ObjectId
  contentType: string
  length: number
  metadata: Record<string, unknown> & {
    fileId?: string
    uploaderId?: string
    organizationId?: string
    createdAt?: Date
    categoryId?: string
    clientId?: string
    projectId?: string
  }
  uploadDate: Date
}

export async function uploadFile(
  client: MongoClient,
  body: Buffer,
  options: {
    originalFilename: string
    contentType: string
    userId: string
    organizationId: string
    categoryId?: string
    clientId?: string
    projectId?: string
  }
): Promise<FileRecord> {
  const { originalFilename, contentType, userId, organizationId, categoryId, clientId, projectId } = options

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw Object.assign(new Error("Unsupported file type"), { status: 400 })
  }
  if (body.length > MAX_FILE_SIZE) {
    throw Object.assign(new Error("File too large (max 10 MB)"), { status: 400 })
  }

  // Sanitize filename
  const sanitizedName = originalFilename.replace(/[^\w.\-<>():;!@#$%^&*+=,?\\/\s]/gi, "_").slice(0, 200)
  const storedName = `${randomUUID()}_${sanitizedName}`

  const bucket = getGridFS(client)
  const uploadStream = bucket.openUploadStream(storedName, {
    metadata: {
      originalFilename: sanitizedName,
      contentType,
      uploaderId: userId,
      organizationId,
      ...(categoryId ? { categoryId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
    },
    contentType,
  })

  // Write buffer directly to stream and wait for completion.
  // The GridFS _id IS the canonical fileId — keep every layer consistent.
  const uploadedFileId = await new Promise<string>((resolve, reject) => {
    uploadStream.write(body)
    uploadStream.end()
    uploadStream.on("finish", () => resolve(uploadStream.id.toString()))
    uploadStream.on("error", reject)
  })

  return {
    fileId: uploadedFileId,
    originalFilename: sanitizedName,
    contentType,
    size: body.length,
    uploaderId: userId,
    organizationId,
    categoryId: categoryId ?? null,
    clientId: clientId ?? null,
    projectId: projectId ?? null,
    createdAt: new Date(),
  }
}

export async function uploadAvatar(
  client: MongoClient,
  body: Buffer,
  options: { userId: string; organizationId: string }
): Promise<string | null> {
  const { userId, organizationId } = options

  if (body.length > AVATAR_MAX_FILE_SIZE) {
    throw Object.assign(new Error("Avatar too large (max 5 MB)"), { status: 400 })
  }

  // Validate it's actually an image by checking magic bytes
  if (body.length < 4) {
    throw Object.assign(new Error("Invalid image file"), { status: 400 })
  }
  const header = body.subarray(0, 4)
  const isJpg = header[0] === 0xff && header[1] === 0xd8
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47
  const isGif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46
  const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[6] === 0x57 && header[7] === 0x45 && header[8] === 0x50

  if (!isJpg && !isPng && !isGif && !isWebp) {
    throw Object.assign(new Error("Invalid image format. Only JPEG, PNG, GIF, and WebP are allowed."), { status: 400 })
  }

  const contentType = isJpg ? "image/jpeg" : isPng ? "image/png" : isGif ? "image/gif" : "image/webp"
  const bucket = getGridFS(client)
  const storedName = `avatar_${userId}_${randomUUID()}.bin`

  const uploadStream = bucket.openUploadStream(storedName, {
    metadata: {
      originalFilename: "avatar",
      contentType,
      uploaderId: userId,
      organizationId,
      isAvatar: true,
    },
    contentType,
  })

  return new Promise<string>((resolve, reject) => {
    uploadStream.write(body, (err) => {
      if (err) return reject(err)
      uploadStream.end()
    })
    uploadStream.on("finish", () => resolve(uploadStream.id.toString()))
    uploadStream.on("error", reject)
  })
}

export async function deleteFile(
  client: MongoClient,
  fileId: string,
  _userId: string,
  _organizationId: string
): Promise<void> {
  void _userId
  void _organizationId
  const bucket = getGridFS(client)
  let objectId: ObjectId
  try {
    objectId = new ObjectId(fileId)
  } catch {
    throw Object.assign(new Error("Invalid file ID"), { status: 400 })
  }

  // Delete from GridFS chunks/files collections
  await bucket.delete(objectId)
}
export async function getFileMetadata(
  client: MongoClient,
  fileId: string
): Promise<FileRecord | null> {
  const bucket = getGridFS(client)
  let objectId: ObjectId
  try {
    objectId = new ObjectId(fileId)
  } catch {
    return null
  }
  const doc = await bucket.find({ _id: objectId }).toArray()
  if (!doc.length) return null
  const m = doc[0].metadata as Record<string, unknown> & { uploaderId?: string; organizationId?: string; createdAt?: Date; categoryId?: string; clientId?: string; projectId?: string }
  return {
    fileId: doc[0]._id.toString(),
    originalFilename: (m.originalFilename as string) || "unknown",
    contentType: doc[0].contentType || "application/octet-stream",
    size: doc[0].length,
    uploaderId: (m.uploaderId as string) || "",
    organizationId: (m.organizationId as string) || "",
    categoryId: (m.categoryId as string) || null,
    clientId: (m.clientId as string) || null,
    projectId: (m.projectId as string) || null,
    createdAt: (m.createdAt as Date) || new Date(),
  }
}

export async function listFiles(
  client: MongoClient,
  options: {
    userId: string
    organizationId: string
    clientId?: string
    projectId?: string
    page?: number
    limit?: number
  }
): Promise<{ files: FileRecord[]; total: number }> {
  const { userId, organizationId, clientId, projectId, page = 1, limit = 20 } = options
  const bucket = getGridFS(client)

  const query: Record<string, unknown> = {
    "metadata.uploaderId": userId,
    "metadata.organizationId": organizationId,
  }
  if (clientId) query["metadata.clientId"] = clientId
  if (projectId) query["metadata.projectId"] = projectId

  const [docs, total] = await Promise.all([
    bucket.find(query).sort({ uploadDate: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    bucket.find(query).count(),
  ])

  const files: FileRecord[] = (docs as unknown as GridFSDoc[]).map((d) => {
    const m = d.metadata as Record<string, unknown> & { uploaderId?: string; organizationId?: string; createdAt?: Date; categoryId?: string; clientId?: string; projectId?: string }
    return {
      fileId: d._id.toString(),
      originalFilename: (m.originalFilename as string) || "unknown",
      contentType: d.contentType || "application/octet-stream",
      size: d.length,
      uploaderId: (m.uploaderId as string) || "",
      organizationId: (m.organizationId as string) || "",
      categoryId: (m.categoryId as string) || null,
      clientId: (m.clientId as string) || null,
      projectId: (m.projectId as string) || null,
      createdAt: (m.createdAt as Date) || d.uploadDate,
    }
  })

  return { files, total }
}

export async function getUserAvatar(
  client: MongoClient,
  userId: string
): Promise<string | null> {
  const bucket = getGridFS(client)
  const cursor = bucket.find({
    "metadata.uploaderId": userId,
    "metadata.isAvatar": true,
  }).sort({ uploadDate: -1 }).limit(1)
  const docs = await cursor.toArray()
  if (!docs.length) return null
  return docs[0]._id.toString()
}

export function getClient(): MongoClient {
  const mc = mongoose.connection as unknown as { client?: MongoClient; db?: { client?: MongoClient } }
  if (!mc?.client) {
    throw new Error("MongoDB client not available. Ensure database is connected.")
  }
  return mc.client!
}

export function getClientOrThrow(): MongoClient {
  return getClient()
}
