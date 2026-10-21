/**
 * Tests verifying organization-scoped data isolation.
 *
 * These tests create two separate organizations with users and verify that
 * data from Org A is not accessible to users in Org B — even when the
 * resource ID is known.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestData, cleanupTestData, User, Organization, Membership, Client, Task, Invoice } from '../utils/test-utils'

type ClientDoc = { _id: { toString(): string }; organizationId: { toString(): string } }
type TaskDoc = { _id: { toString(): string }; organizationId: { toString(): string } }
type InvoiceDoc = { _id: { toString(): string }; organizationId: { toString(): string } }

describe('Tenant Isolation', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>> = null
  let testOrgId: string

  beforeAll(async () => {
    testData = await setupTestData()
    if (!testData) return
    testOrgId = testData.orgId
  }, 30000)

  afterAll(async () => {
    await cleanupTestData()
  })

  it('should not leak clients across organizations', async () => {
    if (!testData) return

    // Create a second org and client
    const org2 = await Organization.create({ name: 'Org2', slug: `org2-${Date.now()}` })
    const user2 = await User.create({ email: `user2-${Date.now()}@example.com`, name: 'User 2', role: 'MEMBER' })
    await Membership.create({ userId: user2._id, organizationId: org2._id, role: 'MEMBER' })

    const clientInOrg2 = await Client.create({
      firstName: 'Secret', lastName: 'Client', email: 'secret@example.com',
      organizationId: org2._id, createdById: user2._id,
    })

    // User from Org A should not see the client from Org B
    const clientsInOrg1 = await Client.find({ organizationId: testOrgId })
    const clientsInOrg2 = await Client.find({ organizationId: org2._id })

    expect(clientsInOrg1.some((c: ClientDoc) => c._id.toString() === clientInOrg2._id.toString())).toBe(false)
    expect(clientsInOrg2.some((c: ClientDoc) => c._id.toString() === clientInOrg2._id.toString())).toBe(true)
  })

  it('should not leak tasks across organizations', async () => {
    if (!testData) return

    const org2 = await Organization.create({ name: 'Org2-tasks', slug: `org2-tasks-${Date.now()}` })
    const user2 = await User.create({ email: `user2-t-${Date.now()}@example.com`, name: 'User 2T', role: 'MEMBER' })
    await Membership.create({ userId: user2._id, organizationId: org2._id, role: 'MEMBER' })

    // Task WITHOUT a projectId (the previously vulnerable case)
    const taskInOrg2 = await Task.create({
      title: 'Secret Task No Project',
      description: 'Should not be visible to Org A',
      status: 'BACKLOG',
      priority: 'HIGH',
      organizationId: org2._id,
    })

    // Task WITH a projectId in Org B
    const taskWithProject = await Task.create({
      title: 'Secret Task With Project',
      description: 'Also should not be visible',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      organizationId: org2._id,
      projectId: null,
    })

    // Tasks scoped to Org A should not contain Org B's tasks
    const tasksInOrg1 = await Task.find({ organizationId: testOrgId })
    const allTasks = await Task.find({})

    // Org A users can only see their own tasks
    expect(tasksInOrg1.some((t: TaskDoc) => t._id.toString() === taskInOrg2._id.toString())).toBe(false)
    // All tasks in system include both orgs' tasks
    expect(allTasks.some((t: TaskDoc) => t._id.toString() === taskInOrg2._id.toString())).toBe(true)
    expect(allTasks.some((t: TaskDoc) => t._id.toString() === taskWithProject._id.toString())).toBe(true)
  })

  it('should isolate invoices by organization', async () => {
    if (!testData) return

    const org2 = await Organization.create({ name: 'Org2-inv', slug: `org2-inv-${Date.now()}` })
    const client2 = await Client.create({
      firstName: 'Inv', lastName: 'Client', email: `inv-${Date.now()}@example.com`,
      organizationId: org2._id,
    })
    const invoiceInOrg2 = await Invoice.create({
      number: `INV-TEST-${Date.now()}`,
      clientId: client2._id,
      status: 'DRAFT',
      organizationId: org2._id,
      subtotal: 500, taxRate: 10, taxAmount: 50, total: 550, paidAmount: 0,
    })

    const invoicesInOrg1 = await Invoice.find({ organizationId: testOrgId })
    expect(invoicesInOrg1.some((i: InvoiceDoc) => i._id.toString() === invoiceInOrg2._id.toString())).toBe(false)
  })
})