import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { setupTestData, cleanupTestData, MongoFileModel as FileModel } from '../utils/test-utils'
import { GridFSBucket, MongoClient } from 'mongodb'

let testOrgId: string
let testUserId: string
let testData: Awaited<ReturnType<typeof setupTestData>> = null
let mongoClient: MongoClient | null = null

beforeAll(async () => {
  testData = await setupTestData()
  if (!testData) return
  testOrgId = testData.orgId
  testUserId = testData.userId
  // Get the underlying MongoClient from Mongoose
  mongoClient = ((mongoose.connection as unknown as { db?: { client?: MongoClient } }).db?.client) ?? null
}, 30000)

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  if (!testData) return
  if (mongoose.connection.readyState !== 1) return
  await FileModel.deleteMany({ organizationId: testOrgId })
})

function checkDb() {
  if (!testData) throw new Error('MongoDB not available')
}

describe('File Model', () => {
  it('should create a file record with valid data', async () => {
    checkDb()
    const fileId = new mongoose.Types.ObjectId().toString()
    const file = await FileModel.create({
      fileId,
      originalFilename: 'test.pdf',
      contentType: 'application/pdf',
      size: 1024,
      uploaderId: testUserId,
      organizationId: testOrgId,
    })
    expect(file).toHaveProperty('_id')
    expect(file.fileId).toBe(fileId)
    expect(file.originalFilename).toBe('test.pdf')
    expect(file.contentType).toBe('application/pdf')
    expect(file.size).toBe(1024)
  })

  it('should find files by organization', async () => {
    checkDb()
    const file1 = await FileModel.create({
      fileId: new mongoose.Types.ObjectId().toString(),
      originalFilename: 'file1.pdf',
      contentType: 'application/pdf',
      size: 512,
      uploaderId: testUserId,
      organizationId: testOrgId,
    })
    const file2 = await FileModel.create({
      fileId: new mongoose.Types.ObjectId().toString(),
      originalFilename: 'file2.png',
      contentType: 'image/png',
      size: 1024,
      uploaderId: testUserId,
      organizationId: testOrgId,
    })
    const files = await FileModel.find({ organizationId: testOrgId })
    expect(files.length).toBe(2)
    expect(files.map(f => f._id.toString())).toContain(file1._id.toString())
    expect(files.map(f => f._id.toString())).toContain(file2._id.toString())
  })

  it('should find files by client reference', async () => {
    checkDb()
    const { Client } = await import('@/lib/database')
    const client = await Client.create({
      firstName: 'Test',
      lastName: 'Client',
      email: 'test@example.com',
      organizationId: testOrgId,
      createdById: testUserId,
    })
    const file = await FileModel.create({
      fileId: new mongoose.Types.ObjectId().toString(),
      originalFilename: 'client_doc.pdf',
      contentType: 'application/pdf',
      size: 2048,
      uploaderId: testUserId,
      organizationId: testOrgId,
      clientId: client._id,
    })
    const found = await FileModel.find({ clientId: client._id })
    expect(found.length).toBe(1)
    expect(found[0]._id.toString()).toBe(file._id.toString())
  })

  it('should find files by project reference', async () => {
    checkDb()
    const { Project } = await import('@/lib/database')
    const project = await Project.create({
      name: 'Test Project',
      organizationId: testOrgId,
      createdById: testUserId,
    })
    const file = await FileModel.create({
      fileId: new mongoose.Types.ObjectId().toString(),
      originalFilename: 'project_doc.pdf',
      contentType: 'application/pdf',
      size: 2048,
      uploaderId: testUserId,
      organizationId: testOrgId,
      projectId: project._id,
    })
    const found = await FileModel.find({ projectId: project._id })
    expect(found.length).toBe(1)
    expect(found[0]._id.toString()).toBe(file._id.toString())
  })

  it('should update file metadata', async () => {
    checkDb()
    const file = await FileModel.create({
      fileId: new mongoose.Types.ObjectId().toString(),
      originalFilename: 'original.pdf',
      contentType: 'application/pdf',
      size: 1024,
      uploaderId: testUserId,
      organizationId: testOrgId,
    })
    const updated = await FileModel.findOneAndUpdate(
      { _id: file._id },
      { originalFilename: 'updated.pdf' },
      { new: true }
    )
    expect(updated?.originalFilename).toBe('updated.pdf')
    expect(updated?.fileId).toBe(file.fileId)
  })

  it('should delete a file record', async () => {
    checkDb()
    const file = await FileModel.create({
      fileId: new mongoose.Types.ObjectId().toString(),
      originalFilename: 'delete_me.pdf',
      contentType: 'application/pdf',
      size: 1024,
      uploaderId: testUserId,
      organizationId: testOrgId,
    })
    await FileModel.deleteOne({ _id: file._id })
    const found = await FileModel.findById(file._id)
    expect(found).toBeNull()
  })

  it('should require unique fileId', async () => {
    checkDb()
    const fileId = new mongoose.Types.ObjectId().toString()
    await FileModel.create({
      fileId,
      originalFilename: 'file1.pdf',
      contentType: 'application/pdf',
      size: 1024,
      uploaderId: testUserId,
      organizationId: testOrgId,
    })
    // Try to create another file with the same ID
    const dup = await FileModel.create({
      fileId,
      originalFilename: 'file2.pdf',
      contentType: 'application/pdf',
      size: 1024,
      uploaderId: testUserId,
      organizationId: testOrgId,
    }).catch(() => null)
    expect(dup).toBeNull()
  })
})

describe('GridFS Operations', () => {
  it('should upload a file to GridFS', async () => {
    checkDb()
    if (!mongoClient) return
    const bucket = new GridFSBucket(mongoClient.db(), { bucketName: 'files' })

    const buffer = Buffer.from('test file content')
    const uploadStream = bucket.openUploadStream('test.txt', {
      metadata: {
        originalFilename: 'test.txt',
        contentType: 'text/plain',
        uploaderId: testUserId,
        organizationId: testOrgId,
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.write(buffer)
      uploadStream.end()
      uploadStream.on('finish', resolve)
      uploadStream.on('error', reject)
    })

    const docs = await bucket.find({ 'metadata.originalFilename': 'test.txt' }).toArray()
    expect(docs.length).toBeGreaterThan(0)
  })

  it('should download a file from GridFS', async () => {
    checkDb()
    if (!mongoClient) return
    const bucket = new GridFSBucket(mongoClient.db(), { bucketName: 'files' })

    // Upload first
    const buffer = Buffer.from('downloadable content')
    const uploadStream = bucket.openUploadStream('download.txt', {
      metadata: {
        originalFilename: 'download.txt',
        contentType: 'text/plain',
        uploaderId: testUserId,
        organizationId: testOrgId,
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.write(buffer)
      uploadStream.end()
      uploadStream.on('finish', resolve)
      uploadStream.on('error', reject)
    })

    // Download
    const docs = await bucket.find({ 'metadata.originalFilename': 'download.txt' }).toArray()
    expect(docs.length).toBeGreaterThan(0)
    const downloadStream = bucket.openDownloadStream(docs[0]._id)
    const chunks: Buffer[] = []
    for await (const chunk of downloadStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const downloaded = Buffer.concat(chunks)
    expect(downloaded.toString()).toBe('downloadable content')
  })

  it('should delete a file from GridFS', async () => {
    checkDb()
    if (!mongoClient) return
    const bucket = new GridFSBucket(mongoClient.db(), { bucketName: 'files' })

    // Upload first
    const buffer = Buffer.from('to be deleted')
    const uploadStream = bucket.openUploadStream('delete.txt', {
      metadata: {
        originalFilename: 'delete.txt',
        contentType: 'text/plain',
        uploaderId: testUserId,
        organizationId: testOrgId,
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.write(buffer)
      uploadStream.end()
      uploadStream.on('finish', resolve)
      uploadStream.on('error', reject)
    })

    // Get the file ID
    const docs = await bucket.find({ 'metadata.originalFilename': 'delete.txt' }).toArray()
    const fileId = docs[0]._id

    // Delete
    await bucket.delete(fileId)

    // Verify it's gone
    const remaining = await bucket.find({ _id: fileId }).toArray()
    expect(remaining).toHaveLength(0)
  })
})
