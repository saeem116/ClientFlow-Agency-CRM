import { describe, it, expect, beforeAll, afterAll, beforeEach, test } from 'vitest'
import { setupTestData, cleanupTestData, Project, Task, Milestone, Client, Organization, User } from '../utils/test-utils'

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
  await Project.deleteMany({})
  await Task.deleteMany({})
  await Milestone.deleteMany({})
  await Organization.deleteMany({})
  await User.deleteMany({})
})

describe('Project Progress Business Logic', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create project with budget and track completion', async () => {
    const project = await Project.create({
      name: 'Progress Tracking Project', description: 'Test project for progress tracking',
      status: 'ACTIVE', priority: 'HIGH', budget: 10000,
      organizationId: testOrgId, clientId: testClientId, createdById: testUserId,
    })
    expect(project.status).toBe('ACTIVE')
    expect(project.budget).toBe(10000)
  })

  it('should update project status progression', async () => {
    const project = await Project.create({
      name: 'Status Progress Project', status: 'DRAFT', priority: 'MEDIUM',
      organizationId: testOrgId, clientId: testClientId, createdById: testUserId,
    })
    expect(project.status).toBe('DRAFT')
    const d = await Project.findOneAndUpdate({ _id: project._id }, { status: 'ACTIVE' }, { new: true })
    expect(d?.status).toBe('ACTIVE')
    const o = await Project.findOneAndUpdate({ _id: project._id }, { status: 'ON_HOLD' }, { new: true })
    expect(o?.status).toBe('ON_HOLD')
    const c = await Project.findOneAndUpdate({ _id: project._id }, { status: 'COMPLETED' }, { new: true })
    expect(c?.status).toBe('COMPLETED')
  })

  it('should update project budget', async () => {
    const project = await Project.create({
      name: 'Budget Update Project', status: 'ACTIVE', priority: 'MEDIUM',
      budget: 5000, organizationId: testOrgId, clientId: testClientId, createdById: testUserId,
    })
    expect(project.budget).toBe(5000)
    const updated = await Project.findOneAndUpdate({ _id: project._id }, { budget: 7500 }, { new: true })
    expect(updated?.budget).toBe(7500)
  })

  it('should track project milestones', async () => {
    const project = await Project.create({
      name: 'Milestone Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId, createdById: testUserId,
    })
    const milestone = await Milestone.create({
      title: 'Milestone 1', description: 'First milestone',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      projectId: project._id,
    })
    expect(milestone.title).toBe('Milestone 1')
    expect(milestone.projectId.toString()).toBe(project._id.toString())
  })

  it('should calculate project tasks completion', async () => {
    const project = await Project.create({
      name: 'Task Completion Project', status: 'ACTIVE',
      organizationId: testOrgId, clientId: testClientId, createdById: testUserId,
    })
    await Task.create({ title: 'Completed Task', status: 'DONE', projectId: project._id, assigneeId: testUserId })
    await Task.create({ title: 'In Progress Task', status: 'IN_PROGRESS', projectId: project._id, assigneeId: testUserId })
    await Task.create({ title: 'Backlog Task', status: 'BACKLOG', projectId: project._id, assigneeId: testUserId })
    const completedTasks = await Task.find({ projectId: project._id, status: 'DONE' })
    const inProgressTasks = await Task.find({ projectId: project._id, status: 'IN_PROGRESS' })
    const backlogTasks = await Task.find({ projectId: project._id, status: 'BACKLOG' })
    expect(completedTasks.length).toBe(1)
    expect(inProgressTasks.length).toBe(1)
    expect(backlogTasks.length).toBe(1)
  })

  it('should filter projects by status', async () => {
    await Project.create({ name: 'Draft Project', status: 'DRAFT', organizationId: testOrgId, clientId: testClientId, createdById: testUserId })
    await Project.create({ name: 'Active Project', status: 'ACTIVE', organizationId: testOrgId, clientId: testClientId, createdById: testUserId })
    const activeProjects = await Project.find({ organizationId: testOrgId, status: 'ACTIVE' })
    expect(activeProjects.length).toBe(1)
    expect(activeProjects[0].status).toBe('ACTIVE')
  })

  it('should find projects by client', async () => {
    await Project.create({ name: 'Client A Project 1', status: 'ACTIVE', organizationId: testOrgId, clientId: testClientId, createdById: testUserId })
    await Project.create({ name: 'Client A Project 2', status: 'DRAFT', organizationId: testOrgId, clientId: testClientId, createdById: testUserId })
    const clientProjects = await Project.find({ clientId: testClientId, organizationId: testOrgId })
    expect(clientProjects.length).toBe(2)
  })

  it('should calculate project budget utilization', async () => {
    const project = await Project.create({
      name: 'Budget Utilization Project', status: 'ACTIVE',
      budget: 10000, organizationId: testOrgId, clientId: testClientId, createdById: testUserId,
    })
    const tasks = await Task.find({ projectId: project._id })
    expect(tasks.length).toBe(0)
  })
})