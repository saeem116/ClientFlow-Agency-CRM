import { describe, it, expect, beforeAll, afterAll, beforeEach, test } from 'vitest'
import { setupTestData, cleanupTestData, Lead, Client, Project, Task, Organization, User } from '../utils/test-utils'

let testOrgId: string
let testUserId: string
let testClientId: string
let testData: Awaited<ReturnType<typeof setupTestData>> | null = null

beforeAll(async () => {
  testData = await setupTestData()
  if (!testData) {
    test.skip('MongoDB not available')
    return
  }
  testOrgId = testData.orgId
  testUserId = testData.userId
  testClientId = testData.clientId
})

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  if (!testData) return
  await Lead.deleteMany({})
  await Client.deleteMany({})
  await Project.deleteMany({})
  await Task.deleteMany({})
  await Organization.deleteMany({})
  await User.deleteMany({})
})

describe('Lead Pipeline Business Logic', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should transition lead through pipeline stages', async () => {
    const lead = await Lead.create({
      title: 'Pipeline Lead', email: 'pipeline@example.com', stage: 'NEW',
      organizationId: testOrgId, createdById: testUserId,
    })
    expect(lead.stage).toBe('NEW')
    const c = await Lead.findOneAndUpdate({ _id: lead._id }, { stage: 'CONTACTED' }, { new: true })
    expect(c?.stage).toBe('CONTACTED')
    const q = await Lead.findOneAndUpdate({ _id: lead._id }, { stage: 'QUALIFIED' }, { new: true })
    expect(q?.stage).toBe('QUALIFIED')
    const p = await Lead.findOneAndUpdate({ _id: lead._id }, { stage: 'PROPOSAL_SENT' }, { new: true })
    expect(p?.stage).toBe('PROPOSAL_SENT')
    const w = await Lead.findOneAndUpdate({ _id: lead._id }, { stage: 'WON' }, { new: true })
    expect(w?.stage).toBe('WON')
  })

  it('should convert won lead to client', async () => {
    const lead = await Lead.create({
      title: 'Convert Lead', email: 'convert@example.com', stage: 'WON',
      organizationId: testOrgId, createdById: testUserId,
    })
    const updated = await Lead.findOneAndUpdate(
      { _id: lead._id }, { clientId: testClientId }, { new: true }
    )
    expect(updated?.clientId?.toString()).toBe(testClientId)
  })

  it('should calculate lead value by stage', async () => {
    await Lead.create({ title: 'New Lead Value', email: 'newvalue@example.com', stage: 'NEW', value: 1000, organizationId: testOrgId, createdById: testUserId })
    await Lead.create({ title: 'Qualified Lead Value', email: 'qualifiedvalue@example.com', stage: 'QUALIFIED', value: 3000, organizationId: testOrgId, createdById: testUserId })
    await Lead.create({ title: 'Won Lead Value', email: 'wonvalue@example.com', stage: 'WON', value: 5000, organizationId: testOrgId, createdById: testUserId })
    const newLeads = await Lead.find({ organizationId: testOrgId, stage: 'NEW' })
    const qualifiedLeads = await Lead.find({ organizationId: testOrgId, stage: 'QUALIFIED' })
    const wonLeads = await Lead.find({ organizationId: testOrgId, stage: 'WON' })
    expect(newLeads.length).toBe(1)
    expect(qualifiedLeads.length).toBe(1)
    expect(wonLeads.length).toBe(1)
    expect(newLeads[0].value).toBe(1000)
    expect(qualifiedLeads[0].value).toBe(3000)
    expect(wonLeads[0].value).toBe(5000)
  })

  it('should aggregate total lead value', async () => {
    await Lead.create({ title: 'New Lead Value', email: 'newvalue@example.com', stage: 'NEW', value: 1000, organizationId: testOrgId, createdById: testUserId })
    await Lead.create({ title: 'Qualified Lead Value', email: 'qualifiedvalue@example.com', stage: 'QUALIFIED', value: 3000, organizationId: testOrgId, createdById: testUserId })
    await Lead.create({ title: 'Won Lead Value', email: 'wonvalue@example.com', stage: 'WON', value: 5000, organizationId: testOrgId, createdById: testUserId })
    const leads = await Lead.find({ organizationId: testOrgId })
    const totalValue = leads.reduce((sum: number, l) => sum + (l.value ?? 0), 0)
    expect(totalValue).toBe(9000)
  })

  it('should handle lost leads', async () => {
    const lostLead = await Lead.create({
      title: 'Lost Lead', email: 'lost@example.com', stage: 'LOST',
      value: 2000, organizationId: testOrgId, createdById: testUserId,
    })
    expect(lostLead.stage).toBe('LOST')
  })

  it('should track lead source', async () => {
    const websiteLead = await Lead.create({
      title: 'Website Lead', email: 'website@example.com', stage: 'NEW',
      source: 'WEBSITE', organizationId: testOrgId, createdById: testUserId,
    })
    expect(websiteLead.source).toBe('WEBSITE')
  })

  it('should handle lead with follow-up date', async () => {
    const followUpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const lead = await Lead.create({
      title: 'Follow-up Lead', email: 'followup@example.com', stage: 'CONTACTED',
      followUpAt: followUpDate, organizationId: testOrgId, createdById: testUserId,
    })
    expect(lead.followUpAt).not.toBeNull()
    expect(lead.followUpAt!.getTime()).toBe(followUpDate.getTime())
  })
})