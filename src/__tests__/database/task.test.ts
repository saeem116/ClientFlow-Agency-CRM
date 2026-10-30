import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { setupTestData, cleanupTestData, Task, Project } from '../utils/test-utils'

let testOrgId: string
let testUserId: string
let testProjectId: string
let testData: Awaited<ReturnType<typeof setupTestData>> = null

beforeAll(async () => {
  testData = await setupTestData()
  if (!testData) return
  testOrgId = testData.orgId
  testUserId = testData.userId
  const project = await Project.create({
    name: 'Test Project for Tasks', status: 'ACTIVE',
    organizationId: testOrgId, clientId: testData.clientId, createdById: testUserId,
  })
  testProjectId = project._id.toString()
}, 30000)

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  if (!testData) return
  if (mongoose.connection.readyState !== 1) return
  await Task.deleteMany({})
})

describe('Task CRUD Operations', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create a task with valid data', async () => {
    const task = await Task.create({
      title: 'Test Task', description: 'Test task description', status: 'BACKLOG',
      priority: 'MEDIUM', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      projectId: testProjectId, assigneeId: testUserId,
    })
    expect(task).toHaveProperty('_id')
    expect(task.status).toBe('BACKLOG')
    expect(task.priority).toBe('MEDIUM')
  })

  it('should create a task with minimal required fields', async () => {
    const task = await Task.create({
      title: 'Minimal Task', projectId: testProjectId,
    })
    expect(task).toHaveProperty('_id')
    expect(task.title).toBe('Minimal Task')
    expect(task.status).toBe('BACKLOG')
    expect(task.priority).toBe('MEDIUM')
  })

  it('should update task status', async () => {
    const task = await Task.create({
      title: 'Status Test Task', status: 'BACKLOG', projectId: testProjectId,
      assigneeId: testUserId,
    })
    const updated = await Task.findOneAndUpdate(
      { _id: task._id }, { status: 'IN_PROGRESS' }, { new: true }
    )
    expect(updated?.status).toBe('IN_PROGRESS')
  })

  it('should update task priority', async () => {
    const task = await Task.create({
      title: 'Priority Test Task', status: 'BACKLOG', priority: 'LOW',
      projectId: testProjectId, assigneeId: testUserId,
    })
    const updated = await Task.findOneAndUpdate(
      { _id: task._id }, { priority: 'HIGH' }, { new: true }
    )
    expect(updated?.priority).toBe('HIGH')
  })

  it('should delete a task', async () => {
    const task = await Task.create({
      title: 'Delete Task', status: 'BACKLOG', projectId: testProjectId,
      assigneeId: testUserId,
    })
    await Task.deleteOne({ _id: task._id })
    const found = await Task.findById(task._id)
    expect(found).toBeNull()
  })

  it('should find tasks by project', async () => {
    await Task.create({ title: 'Project Task 1', status: 'BACKLOG', projectId: testProjectId, assigneeId: testUserId })
    const tasks = await Task.find({ projectId: testProjectId })
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0].projectId.toString()).toBe(testProjectId)
  })

  it('should find tasks by assignee', async () => {
    await Task.create({ title: 'Assignee Task', status: 'BACKLOG', projectId: testProjectId, assigneeId: testUserId })
    const tasks = await Task.find({ assigneeId: testUserId })
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0].assigneeId.toString()).toBe(testUserId)
  })

  it('should filter tasks by status', async () => {
    await Task.create({ title: 'Backlog Task', status: 'BACKLOG', projectId: testProjectId, assigneeId: testUserId })
    await Task.create({ title: 'Done Task', status: 'DONE', projectId: testProjectId, assigneeId: testUserId })
    const backlogTasks = await Task.find({ projectId: testProjectId, status: 'BACKLOG' })
    expect(backlogTasks.length).toBe(1)
    expect(backlogTasks[0].status).toBe('BACKLOG')
  })

  it('should mark task as completed with timestamp', async () => {
    const task = await Task.create({ title: 'Complete Task', status: 'BACKLOG', projectId: testProjectId, assigneeId: testUserId })
    const now = new Date()
    const updated = await Task.findOneAndUpdate(
      { _id: task._id }, { status: 'DONE', completedAt: now }, { new: true }
    )
    expect(updated?.status).toBe('DONE')
    expect(updated?.completedAt).not.toBeNull()
  })
})
