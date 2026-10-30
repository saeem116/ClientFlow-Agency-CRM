import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { setupTestData, cleanupTestData, Project } from '../utils/test-utils'

let testOrgId: string
let testUserId: string
let testClientId: string
let testData: Awaited<ReturnType<typeof setupTestData>> = null

beforeAll(async () => {
  testData = await setupTestData()
  if (!testData) return
  testOrgId = testData.orgId
  testUserId = testData.userId
  testClientId = testData.clientId
}, 30000)

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  if (!testData) return
  if (mongoose.connection.readyState !== 1) return
  await Project.deleteMany({ organizationId: testOrgId })
})

describe('Project CRUD Operations', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create a project with valid data', async () => {
    const project = await Project.create({
      name: 'Test Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    expect(project).toHaveProperty('_id')
    expect(project.status).toBe('ACTIVE')
  })

  it('should create a project with minimal required fields', async () => {
    const project = await Project.create({
      name: 'Minimal Project',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    expect(project).toHaveProperty('_id')
    expect(project.status).toBe('ACTIVE')
  })

  it('should update project status', async () => {
    const project = await Project.create({
      name: 'Status Test Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    const updated = await Project.findOneAndUpdate(
      { _id: project._id }, { status: 'COMPLETED' }, { new: true }
    )
    expect(updated?.status).toBe('COMPLETED')
  })

  it('should delete a project', async () => {
    const project = await Project.create({
      name: 'Delete Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    await Project.deleteOne({ _id: project._id })
    const found = await Project.findById(project._id)
    expect(found).toBeNull()
  })

  it('should find projects by organization', async () => {
    await Project.create({
      name: 'Org Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    const projects = await Project.find({ organizationId: testOrgId })
    expect(projects.length).toBeGreaterThan(0)
    expect(projects[0].organizationId.toString()).toBe(testOrgId)
  })

  it('should find projects by client', async () => {
    await Project.create({
      name: 'Client Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    const projects = await Project.find({ clientId: testClientId as any })
    expect(projects.length).toBeGreaterThan(0)
    expect(projects[0].clientId.toString()).toBe(testClientId)
  })

  it('should filter projects by status', async () => {
    await Project.create({
      name: 'Active Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    await Project.create({
      name: 'Completed Project', status: 'COMPLETED',
      organizationId: testOrgId, clientId: testClientId as any, createdById: testUserId,
    })
    const activeProjects = await Project.find({ organizationId: testOrgId, status: 'ACTIVE' })
    expect(activeProjects.length).toBe(1)
    expect(activeProjects[0].status).toBe('ACTIVE')
  })
})
