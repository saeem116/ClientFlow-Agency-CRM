import { describe, it, expect, afterEach } from 'vitest'
import { uploadFile, listFiles, getFileMetadata, getClientOrThrow, getUserAvatar } from '@/lib/gridfs'
import { ObjectId, GridFSBucket } from 'mongodb'

describe('GridFS Utilities', () => {
  const testUserId = new ObjectId().toString()
  const testOrgId = new ObjectId().toString()

  afterEach(async () => {
    // Clean up GridFS files between tests to avoid state leakage
    const client = getClientOrThrow()
    const bucket = new GridFSBucket(client.db(), { bucketName: 'files' })
    const docs = await bucket.find({ 'metadata.uploaderId': testUserId }).toArray()
    for (const doc of docs) {
      await bucket.delete(doc._id)
    }
  })

  it('should validate allowed content types', async () => {
    const client = getClientOrThrow()

    // JPEG magic bytes
    const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    const result = await uploadFile(client, jpgBuffer, {
      originalFilename: 'test.jpg',
      contentType: 'image/jpeg',
      userId: testUserId,
      organizationId: testOrgId,
    })
    expect(result.fileId).toBeDefined()
    expect(result.contentType).toBe('image/jpeg')
  })

  it('should reject unsupported content types', async () => {
    const client = getClientOrThrow()

    const buffer = Buffer.from('not an image')
    await expect(
      uploadFile(client, buffer, {
        originalFilename: 'test.exe',
        contentType: 'application/x-executable',
        userId: testUserId,
        organizationId: testOrgId,
      })
    ).rejects.toThrow('Unsupported file type')
  })

  it('should reject oversized files', async () => {
    const client = getClientOrThrow()

    // Create a buffer larger than 10 MB
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1, 0)
    await expect(
      uploadFile(client, largeBuffer, {
        originalFilename: 'large.pdf',
        contentType: 'application/pdf',
        userId: testUserId,
        organizationId: testOrgId,
      })
    ).rejects.toThrow('File too large')
  })

  it('should store and retrieve file metadata', async () => {
    const client = getClientOrThrow()

    const buffer = Buffer.from('metadata test content')
    const result = await uploadFile(client, buffer, {
      originalFilename: 'metadata_test.pdf',
      contentType: 'application/pdf',
      userId: testUserId,
      organizationId: testOrgId,
    })

    const metadata = await getFileMetadata(client, result.fileId)
    expect(metadata).not.toBeNull()
    expect(metadata?.originalFilename).toBe('metadata_test.pdf')
    expect(metadata?.contentType).toBe('application/pdf')
    expect(metadata?.size).toBe(buffer.length)
    expect(metadata?.uploaderId).toBe(testUserId)
    expect(metadata?.organizationId).toBe(testOrgId)
  })

  it('should list files for a user', async () => {
    const client = getClientOrThrow()

    // Upload multiple files
    for (let i = 0; i < 3; i++) {
      await uploadFile(client, Buffer.from(`content ${i}`), {
        originalFilename: `file_${i}.txt`,
        contentType: 'text/plain',
        userId: testUserId,
        organizationId: testOrgId,
      })
    }

    const { files, total } = await listFiles(client, {
      userId: testUserId,
      organizationId: testOrgId,
      page: 1,
      limit: 10,
    })

    expect(files.length).toBe(3)
    expect(total).toBe(3)
  })

  it('should paginate file listings', async () => {
    const client = getClientOrThrow()

    // Upload 5 files
    for (let i = 0; i < 5; i++) {
      await uploadFile(client, Buffer.from(`page ${i}`), {
        originalFilename: `page_${i}.txt`,
        contentType: 'text/plain',
        userId: testUserId,
        organizationId: testOrgId,
      })
    }

    const page1 = await listFiles(client, {
      userId: testUserId,
      organizationId: testOrgId,
      page: 1,
      limit: 2,
    })
    const page2 = await listFiles(client, {
      userId: testUserId,
      organizationId: testOrgId,
      page: 2,
      limit: 2,
    })

    expect(page1.files.length).toBe(2)
    expect(page2.files.length).toBe(2)
    expect(page1.files[0].originalFilename).not.toBe(page2.files[0].originalFilename)
  })

  it('should filter files by clientId', async () => {
    const client = getClientOrThrow()
    const testClientId = new ObjectId().toString()

    // Upload files with different clientIds
    await uploadFile(client, Buffer.from('client1 file'), {
      originalFilename: 'client1.pdf',
      contentType: 'application/pdf',
      userId: testUserId,
      organizationId: testOrgId,
      clientId: testClientId,
    })
    await uploadFile(client, Buffer.from('client2 file'), {
      originalFilename: 'client2.pdf',
      contentType: 'application/pdf',
      userId: testUserId,
      organizationId: testOrgId,
    })

    const filtered = await listFiles(client, {
      userId: testUserId,
      organizationId: testOrgId,
      clientId: testClientId,
    })

    expect(filtered.files.length).toBe(1)
    expect(filtered.files[0].originalFilename).toBe('client1.pdf')
  })

  it('should return null for getUserAvatar when no avatar exists', async () => {
    const client = getClientOrThrow()
    const avatar = await getUserAvatar(client, new ObjectId().toString())
    expect(avatar).toBeNull()
  })
})