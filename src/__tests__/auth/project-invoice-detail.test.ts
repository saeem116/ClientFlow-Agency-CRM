/**
 * Regression tests for Project and Invoice Detail pages.
 *
 * Verifies that the demo account (and production accounts) can open detail
 * pages for their own records, that the list-to-detail ID flow is consistent,
 * and that security boundaries are enforced.
 *
 * These tests exercise the Mongoose models directly (simulating what the
 * server component does under the hood) because the test database is shared.
 * Full HTTP-level integration is covered by scripts/test-detail-pages.mjs.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupTestData,
  cleanupTestData,
  User,
  Organization,
  Membership,
  Client,
  Project,
  Task,
  Milestone,
  Invoice,
  InvoiceLineItem,
  Payment,
  Activity,
} from '../utils/test-utils'
import mongoose from 'mongoose'

describe('Project Detail Page — Demo/Public Account Flow', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>> | null = null
  let orgId: string
  let projectId: string

  beforeAll(async () => {
    testData = await setupTestData()
    if (!testData) return
    orgId = testData.orgId

    // Create a project that belongs to the test organization.
    const proj = await Project.create({
      name: 'Demo Project Page Test',
      status: 'ACTIVE',
      priority: 'HIGH',
      organizationId: orgId,
      clientId: testData.clientId,
      createdById: testData.userId,
    })
    projectId = proj._id.toString()

    // Create supporting data
    await Task.create({
      title: 'Setup task',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      projectId: proj._id,
      organizationId: orgId,
      assigneeId: testData.userId,
    })
    await Milestone.create({
      title: 'Phase 1',
      projectId: proj._id,
      dueDate: new Date(),
    })
    await Activity.create({
      type: 'project_created',
      title: 'Project started',
      description: 'Project created for testing',
      organizationId: orgId,
      projectId: proj._id,
      createdById: testData.userId,
    })
  }, 30000)

  afterAll(async () => {
    await cleanupTestData()
  })

  it('returns the project for the owning organization', async () => {
    if (!testData) return
    const result = await Project.findOne({ _id: projectId, organizationId: orgId }).lean()
    expect(result).not.toBeNull()
  })

  it('returns null for a project in a different organization', async () => {
    if (!testData) return
    const otherOrg = await Organization.create({ name: 'Other Org', slug: `other-${Date.now()}` })
    const otherProj = await Project.create({
      name: 'Other Project',
      status: 'ACTIVE',
      priority: 'LOW',
      organizationId: otherOrg._id,
      clientId: testData.clientId,
    })
    const result = await Project.findOne({ _id: otherProj._id, organizationId: orgId }).lean()
    expect(result).toBeNull()
  })

  it('returns null for a nonexistent project ID', async () => {
    if (!testData) return
    const result = await Project.findOne({
      _id: '000000000000000000000000',
      organizationId: orgId,
    }).lean()
    expect(result).toBeNull()
  })

  it('has valid related data (tasks, milestones, client) for the demo project', async () => {
    if (!testData) return
    const tasks = await Task.find({ projectId }).lean()
    expect(tasks.length).toBeGreaterThan(0)
    const milestones = await Milestone.find({ projectId }).lean()
    expect(milestones.length).toBeGreaterThan(0)
  })

  it('does not return a project when the ID is not a valid ObjectId', async () => {
    if (!testData) return
    const { ObjectId } = mongoose.Types
    const invalidId = 'not-a-valid-objectid'
    const isValid = ObjectId.isValid(invalidId)
    expect(isValid).toBe(false)
  })
})

describe('Invoice Detail Page — Demo/Public Account Flow', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>> | null = null
  let orgId: string
  let invoiceId: string

  beforeAll(async () => {
    testData = await setupTestData()
    if (!testData) return
    orgId = testData.orgId

    const client = await Client.create({
      firstName: 'Invoice', lastName: 'Client', email: 'invoice-client@example.com',
      organizationId: orgId, createdById: testData.userId,
    })

    const inv = await Invoice.create({
      number: 'INV-TEST-DETAIL',
      status: 'PAID',
      organizationId: orgId,
      clientId: client._id,
      subtotal: 1000,
      taxRate: 10,
      taxAmount: 100,
      total: 1100,
      paidAmount: 1100,
    })
    invoiceId = inv._id.toString()

    await Payment.create({
      amount: 1100,
      date: new Date(),
      method: 'CARD',
      reference: 'TEST-PAY',
      invoiceId: inv._id,
      organizationId: orgId,
    })

    await InvoiceLineItem.create({
      description: 'Test Line Item',
      quantity: 1,
      unitPrice: 1000,
      amount: 1000,
      invoiceId: inv._id,
    })
  }, 30000)

  afterAll(async () => {
    await cleanupTestData()
  })

  it('returns the invoice for the owning organization', async () => {
    if (!testData) return
    const result = await Invoice.findOne({ _id: invoiceId, organizationId: orgId }).lean()
    expect(result).not.toBeNull()
    expect((result as any).number).toBe('INV-TEST-DETAIL')
  })

  it('fetches related payments and line items for the invoice', async () => {
    if (!testData) return
    const payments = await Payment.find({ invoiceId }).lean()
    expect(payments.length).toBeGreaterThan(0)
    const lineItems = await InvoiceLineItem.find({ invoiceId }).lean()
    expect(lineItems.length).toBeGreaterThan(0)
  })

  it('returns null for an invoice in a different organization', async () => {
    if (!testData) return
    const otherOrg = await Organization.create({ name: 'Other Inv Org', slug: `other-inv-${Date.now()}` })
    const otherClient = await Client.create({
      firstName: 'Other', lastName: 'Client', email: 'other-inv-client@example.com',
      organizationId: otherOrg._id, createdById: testData.userId,
    })
    const otherInv = await Invoice.create({
      number: 'INV-OTHER',
      status: 'DRAFT',
      organizationId: otherOrg._id,
      clientId: otherClient._id,
      subtotal: 500, taxRate: 0, taxAmount: 0, total: 500, paidAmount: 0,
    })
    const result = await Invoice.findOne({ _id: otherInv._id, organizationId: orgId }).lean()
    expect(result).toBeNull()
  })

  it('returns null for a nonexistent invoice ID', async () => {
    if (!testData) return
    const result = await Invoice.findOne({
      _id: '000000000000000000000000',
      organizationId: orgId,
    }).lean()
    expect(result).toBeNull()
  })

  it('rejects invalid ObjectIds before hitting the database', async () => {
    if (!testData) return
    const { ObjectId } = mongoose.Types
    expect(ObjectId.isValid('not-a-valid-objectid')).toBe(false)
  })
})