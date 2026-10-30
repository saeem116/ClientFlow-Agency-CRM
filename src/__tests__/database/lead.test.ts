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

describe('Lead CRUD Operations', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create a lead with valid data', async () => {
    const lead = await Lead.create({
      title: 'Jane Doe', email: 'jane@example.com',
      stage: 'NEW', source: 'WEBSITE', organizationId: testOrgId, createdById: testUserId,
    })
    expect(lead).toHaveProperty('_id')
    expect(lead.stage).toBe('NEW')
  })

  it('should create a lead with minimal required fields', async () => {
    const lead = await Lead.create({
      title: 'Minimal Lead', email: 'minimal-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    expect(lead).toHaveProperty('_id')
    expect(lead.stage).toBe('NEW')
  })

  it('should update lead stage', async () => {
    const lead = await Lead.create({
      title: 'Status Test', email: 'status-test@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const updated = await Lead.findOneAndUpdate(
      { _id: lead._id }, { stage: 'CONTACTED' }, { new: true }
    )
    expect(updated?.stage).toBe('CONTACTED')
  })

  it('should delete a lead', async () => {
    const lead = await Lead.create({
      title: 'Delete Me', email: 'delete-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    await Lead.deleteOne({ _id: lead._id })
    const found = await Lead.findById(lead._id)
    expect(found).toBeNull()
  })

  it('should find leads by organization', async () => {
    await Lead.create({
      title: 'Org1 Lead', email: 'org1-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const leads = await Lead.find({ organizationId: testOrgId })
    expect(leads.length).toBeGreaterThan(0)
    expect(leads[0].organizationId.toString()).toBe(testOrgId)
  })

  it('should filter leads by stage', async () => {
    await Lead.create({
      title: 'New1 Lead', email: 'new1-lead@example.com',
      stage: 'NEW', organizationId: testOrgId, createdById: testUserId,
    })
    await Lead.create({
      title: 'Contacted1 Lead', email: 'contacted1-lead@example.com',
      stage: 'CONTACTED', organizationId: testOrgId, createdById: testUserId,
    })
    const newLeads = await Lead.find({ organizationId: testOrgId, stage: 'NEW' })
    expect(newLeads.length).toBe(1)
    expect(newLeads[0].stage).toBe('NEW')
  })

  it('should find lead by email', async () => {
    const lead = await Lead.create({
      title: 'Email Test', email: 'emailtest-lead@example.com',
      organizationId: testOrgId, createdById: testUserId,
    })
    const found = await Lead.findOne({ email: 'emailtest-lead@example.com' })
    expect(found).not.toBeNull()
    expect(found?._id.toString()).toBe(lead._id.toString())
  })
})
