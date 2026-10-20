import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { setupTestData, cleanupTestData, Lead } from '../utils/test-utils'

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
  await Lead.deleteMany({ organizationId: testOrgId })
})

function checkDb() {
  if (!testData) throw new Error('MongoDB not available')
}

describe('Lead CRUD Operations', () => {
  it('should create a lead with valid data', async () => {
    checkDb()
    const lead = await Lead.create({
      firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
      status: 'NEW', source: 'WEBSITE', organizationId: testOrgId, createdById: testUserId,
    })
    expect(lead).toHaveProperty('_id')
    expect(lead.status).toBe('NEW')
  })

  it('should create a lead with minimal required fields', async () => {
    checkDb()
    const lead = await Lead.create({
      firstName: 'Minimal', lastName: 'Lead', email: 'minimal-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    expect(lead).toHaveProperty('_id')
    expect(lead.status).toBe('NEW')
  })

  it('should update lead status', async () => {
    checkDb()
    const lead = await Lead.create({
      firstName: 'Status', lastName: 'Test', email: 'status-test@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const updated = await Lead.findOneAndUpdate(
      { _id: lead._id }, { status: 'CONTACTED' }, { new: true }
    )
    expect(updated?.status).toBe('CONTACTED')
  })

  it('should delete a lead', async () => {
    checkDb()
    const lead = await Lead.create({
      firstName: 'Delete', lastName: 'Me', email: 'delete-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    await Lead.deleteOne({ _id: lead._id })
    const found = await Lead.findById(lead._id)
    expect(found).toBeNull()
  })

  it('should find leads by organization', async () => {
    checkDb()
    await Lead.create({
      firstName: 'Org1', lastName: 'Lead', email: 'org1-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const leads = await Lead.find({ organizationId: testOrgId })
    expect(leads.length).toBeGreaterThan(0)
    expect(leads[0].organizationId.toString()).toBe(testOrgId)
  })

  it('should filter leads by status', async () => {
    checkDb()
    await Lead.create({
      firstName: 'New1', lastName: 'Lead', email: 'new1-lead@example.com',
      status: 'NEW', organizationId: testOrgId, createdById: testUserId,
    })
    await Lead.create({
      firstName: 'Contacted1', lastName: 'Lead', email: 'contacted1-lead@example.com',
      status: 'CONTACTED', organizationId: testOrgId, createdById: testUserId,
    })
    const newLeads = await Lead.find({ organizationId: testOrgId, status: 'NEW' })
    expect(newLeads.length).toBe(1)
    expect(newLeads[0].status).toBe('NEW')
  })

  it('should find lead by email', async () => {
    checkDb()
    const lead = await Lead.create({
      firstName: 'Email', lastName: 'Test', email: 'emailtest-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const found = await Lead.findOne({ email: 'emailtest-lead@example.com' })
    expect(found).not.toBeNull()
    expect(found?._id.toString()).toBe(lead._id.toString())
  })
})