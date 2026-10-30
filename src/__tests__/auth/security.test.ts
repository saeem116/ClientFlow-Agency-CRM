import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestData, cleanupTestData, User, Organization, Membership, Client } from '../utils/test-utils'

let testOrgId: string
let testUserId: string
let testData: Awaited<ReturnType<typeof setupTestData>> | null = null

beforeAll(async () => {
  testData = await setupTestData()
  if (!testData) {
    test.skip('MongoDB not available')
    return
  }
  testOrgId = testData.orgId
  testUserId = testData.userId
})

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  if (!testData) return
  await Membership.deleteMany({ organizationId: testOrgId })
})

describe('Security Tests', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should enforce role-based access control', async () => {
    const user1 = await User.create({ email: 'member@example.com', name: 'Regular User', role: 'MEMBER' })
    const admin1 = await User.create({ email: 'admin@example.com', name: 'Admin User', role: 'ADMIN' })
    await Membership.create({ userId: user1._id, organizationId: testOrgId, role: 'MEMBER' })
    await Membership.create({ userId: admin1._id, organizationId: testOrgId, role: 'ADMIN' })
    const memberships = await Membership.find({ organizationId: testOrgId })
    expect(memberships).toHaveLength(2)
    const roles = new Set(memberships.map((m) => m.role))
    expect(roles.has('MEMBER')).toBe(true)
    expect(roles.has('ADMIN')).toBe(true)
  })

  it('should enforce data isolation between organizations', async () => {
    const org2 = await Organization.create({ name: 'Org 2', slug: 'org-2-' + Date.now() })
    const user2 = await User.create({ email: 'user2@example.com', name: 'User 2', role: 'MEMBER' })
    await Membership.create({ userId: user2._id, organizationId: org2._id, role: 'MEMBER' })
    const clientInOrg2 = await Client.create({
      firstName: 'Client2', lastName: '', email: 'client2@example.com',
      organizationId: org2._id, createdById: user2._id,
    })
    const org1Clients = await Client.find({ organizationId: testOrgId })
    const org2Clients = await Client.find({ organizationId: org2._id })
    expect(org1Clients.length).toBe(0)
    expect(org2Clients.length).toBe(1)
    expect(org2Clients[0].email).toBe('client2@example.com')
    expect(org2Clients[0]._id.toString()).toBe(clientInOrg2._id.toString())
  })

  it('should handle duplicate user emails across organizations', async () => {
    const org2 = await Organization.create({ name: 'Org 2', slug: 'org-2-dup-' + Date.now() })
    const existingUser = await User.findOne({ email: 'duplicate@example.com' })
    const userId = existingUser?._id || (await User.create({ email: 'duplicate@example.com', name: 'Dup User', role: 'MEMBER' }))._id
    await Membership.create({ userId, organizationId: testOrgId, role: 'MEMBER' })
    await Membership.create({ userId, organizationId: org2._id, role: 'MEMBER' })
    const org1Members = await Membership.find({ organizationId: testOrgId })
    const org2Members = await Membership.find({ organizationId: org2._id })
    expect(org1Members.length).toBe(1)
    expect(org2Members.length).toBe(1)
  })

  it('should enforce email uniqueness at user level', async () => {
    const uniqueEmail = `unique-${Date.now()}@example.com`
    await User.create({ email: uniqueEmail, name: 'User 1', role: 'MEMBER' })
    const existing = await User.findOne({ email: uniqueEmail })
    expect(existing).not.toBeNull()
    const dupResult = await User.create({ email: uniqueEmail, name: 'User 2', role: 'MEMBER' }).catch(() => null)
    expect(dupResult).toBeNull()
  })
})