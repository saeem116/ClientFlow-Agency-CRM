import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { setupTestData, cleanupTestData, Client } from '../utils/test-utils'

let testOrgId: string
let testUserId: string
let testData: Awaited<ReturnType<typeof setupTestData>> = null

beforeAll(async () => {
  testData = await setupTestData()
  if (!testData) return
  testOrgId = testData.orgId
  testUserId = testData.userId
}, 30000)

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  if (!testData) return
  if (mongoose.connection.readyState !== 1) return
  await Client.deleteMany({ organizationId: testOrgId })
})

function checkDb() {
  if (!testData) throw new Error('MongoDB not available')
}

describe('Client CRUD Operations', () => {
  it('should create a client with valid data', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'John', lastName: 'Doe', email: 'john@example.com',
      companyName: 'Acme Corp', organizationId: testOrgId, createdById: testUserId,
    })
    expect(client).toHaveProperty('_id')
    expect(client.email).toBe('john@example.com')
    expect(client.status).toBe('active')
  })

  it('should create a client with minimal required fields', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'John', lastName: 'Doe', email: 'minimal@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    expect(client).toHaveProperty('_id')
    expect(client.email).toBe('minimal@example.com')
  })

  it('should update client details', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const updated = await Client.findOneAndUpdate(
      { _id: client._id },
      { firstName: 'Robert', phone: '+1-555-0100' },
      { new: true }
    )
    expect(updated?.firstName).toBe('Robert')
    expect(updated?.phone).toBe('+1-555-0100')
  })

  it('should delete a client', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'Delete', lastName: 'Me', email: 'delete@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    await Client.deleteOne({ _id: client._id })
    const found = await Client.findById(client._id)
    expect(found).toBeNull()
  })

  it('should find clients by organization', async () => {
    checkDb()
    await Client.create({
      firstName: 'Org1', lastName: 'Client', email: 'org1@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const clients = await Client.find({ organizationId: testOrgId })
    expect(clients.length).toBeGreaterThan(0)
    expect(clients[0].organizationId.toString()).toBe(testOrgId)
  })

  it('should handle client status updates', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'Status', lastName: 'Test', email: 'status@example.com',
      status: 'active', organizationId: testOrgId, createdById: testUserId,
    })
    const updated = await Client.findOneAndUpdate(
      { _id: client._id }, { status: 'inactive' }, { new: true }
    )
    expect(updated?.status).toBe('inactive')
  })

  it('should handle client with optional fields as null', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'Minimal', lastName: 'Client', email: 'minimal@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    expect(client.phone).toBeNull()
    expect(client.website).toBeNull()
    expect(client.address).toBeNull()
  })

  it('should find client by email', async () => {
    checkDb()
    const client = await Client.create({
      firstName: 'Email', lastName: 'Test', email: 'emailtest@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const found = await Client.findOne({ email: 'emailtest@example.com' })
    expect(found).not.toBeNull()
    expect(found?._id.toString()).toBe(client._id.toString())
  })
})