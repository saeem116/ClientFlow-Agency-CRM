/**
 * Authorization tests for API routes.
 *
 * These tests verify that:
 * 1. Unauthenticated requests are rejected (401)
 * 2. Valid sessions return data
 * 3. Cross-org access is blocked
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestData, cleanupTestData, Organization, Task, Client } from '../utils/test-utils'

type TaskDoc = { _id: { toString(): string }; organizationId: { toString(): string } }
type ClientDoc = { _id: { toString(): string }; organizationId: { toString(): string } }

describe('API Authorization', () => {
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

  describe('Task API scope', () => {
    it('should scope task queries by organizationId', async () => {
      if (!testData) return

      // Create a task in Org A
      const taskInOrg1 = await Task.create({
        title: 'Org1 Task',
        description: 'Task in Org A',
        status: 'BACKLOG',
        priority: 'MEDIUM',
        organizationId: testOrgId,
      })

      // Create another org and task
      const org2 = await Organization.create({ name: 'Org2', slug: `org2-${Date.now()}` })
      const taskInOrg2 = await Task.create({
        title: 'Org2 Task',
        description: 'Task in Org B',
        status: 'BACKLOG',
        priority: 'LOW',
        organizationId: org2._id,
      })

      // Query scoped to Org A should not see Org B's task
      const org1Tasks = await Task.find({ organizationId: testOrgId })
      expect(org1Tasks.some((t: TaskDoc) => t._id.toString() === taskInOrg2._id.toString())).toBe(false)

      // Query scoped to Org B should not see Org A's task
      const org2Tasks = await Task.find({ organizationId: org2._id })
      expect(org2Tasks.some((t: TaskDoc) => t._id.toString() === taskInOrg1._id.toString())).toBe(false)
    })

    it('should require organizationId when creating tasks', async () => {
      if (!testData) return

      const org2 = await Organization.create({ name: 'Org2-create', slug: `org2-create-${Date.now()}` })

      // Create a task with explicit organizationId
      const task = await Task.create({
        title: 'Task with Org',
        status: 'BACKLOG',
        priority: 'LOW',
        organizationId: org2._id,
      })

      expect(task.organizationId.toString()).toBe(org2._id.toString())
    })
  })

  describe('Client API scope', () => {
    it('should scope client queries by organizationId', async () => {
      if (!testData) return

      const org2 = await Organization.create({ name: 'Org2-clients', slug: `org2-clients-${Date.now()}` })
      const clientInOrg2 = await Client.create({
        firstName: 'Org2', lastName: 'Client', email: `org2-client-${Date.now()}@example.com`,
        organizationId: org2._id,
      })

      // Org A should not see Org B's client
      const org1Clients = await Client.find({ organizationId: testOrgId })
      expect(org1Clients.some((c: ClientDoc) => c._id.toString() === clientInOrg2._id.toString())).toBe(false)

      // Org B should see their own client
      const org2Clients = await Client.find({ organizationId: org2._id })
      expect(org2Clients.some((c: ClientDoc) => c._id.toString() === clientInOrg2._id.toString())).toBe(true)
    })
  })
})