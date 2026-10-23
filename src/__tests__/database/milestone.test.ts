/**
 * Milestone model and basic business logic tests.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestData, cleanupTestData, Project, Milestone, Task } from '../utils/test-utils'

let testOrgId = ''
let testUserId = ''
let testData: { orgId: string; userId: string } | null = null

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
  await Milestone.deleteMany({})
  await Task.deleteMany({})
})

describe('Milestone Model', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create a milestone with required fields', async () => {
    const project = await Project.create({
      name: 'Milestone Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      organizationId: testOrgId,
      createdById: testUserId,
    })

    const milestone = await Milestone.create({
      title: 'Alpha Release',
      description: 'First major release',
      projectId: project._id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })

    expect(milestone.title).toBe('Alpha Release')
    expect(milestone.projectId.toString()).toBe(project._id.toString())
    expect(milestone.completedAt).toBeNull()
    expect(typeof milestone.createdAt).toBe('object')
  })

  it('should support marking a milestone as completed', async () => {
    const project = await Project.create({
      name: 'Completed Milestone Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      organizationId: testOrgId,
      createdById: testUserId,
    })

    const milestone = await Milestone.create({
      title: 'Done Milestone',
      projectId: project._id,
    })

    const updated = await Milestone.findOneAndUpdate(
      { _id: milestone._id },
      { completedAt: new Date() },
      { new: true },
    )
    expect(updated).not.toBeNull()
    expect(updated!.completedAt).not.toBeNull()
  })

  it('should calculate milestone progress from linked tasks', async () => {
    const project = await Project.create({
      name: 'Progress Milestone Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      organizationId: testOrgId,
      createdById: testUserId,
    })

    const milestone = await Milestone.create({
      title: 'Sprint 1',
      projectId: project._id,
    })

    await Task.create({ title: 'Done Task', status: 'DONE', projectId: project._id, milestoneId: milestone._id, organizationId: testOrgId })
    await Task.create({ title: 'In Progress Task', status: 'IN_PROGRESS', projectId: project._id, milestoneId: milestone._id, organizationId: testOrgId })
    await Task.create({ title: 'Backlog Task', status: 'BACKLOG', projectId: project._id, milestoneId: milestone._id, organizationId: testOrgId })

    const tasks = await Task.find({ milestoneId: milestone._id }).lean() as unknown as Array<{ status: string }>
    const completed = tasks.filter((t) => t.status === 'DONE').length
    const total = tasks.length

    expect(completed).toBe(1)
    expect(total).toBe(3)
  })

  it('should reject creating a milestone without a title', async () => {
    const project = await Project.create({
      name: 'Title-less Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      organizationId: testOrgId,
      createdById: testUserId,
    })

    await expect(Milestone.create({ title: '', projectId: project._id })).rejects.toThrow()
  })

  it('should return milestones ordered by dueDate then createdAt', async () => {
    const project = await Project.create({
      name: 'Ordered Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      organizationId: testOrgId,
      createdById: testUserId,
    })

    await Milestone.create({ title: 'Later Milestone', projectId: project._id, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
    await Milestone.create({ title: 'Earlier Milestone', projectId: project._id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

    const milestones = await Milestone.find({ projectId: project._id }).sort({ dueDate: 1, createdAt: 1 }).lean()
    expect(milestones[0].title).toBe('Earlier Milestone')
    expect(milestones[1].title).toBe('Later Milestone')
  })
})
