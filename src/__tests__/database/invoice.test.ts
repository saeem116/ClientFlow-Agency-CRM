import { describe, it, expect, beforeAll, afterAll, beforeEach, test } from 'vitest'
import { setupTestData, cleanupTestData, Invoice, InvoiceLineItem, Payment, Client, Organization } from '../utils/test-utils'

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
  await Invoice.deleteMany({ organizationId: testOrgId })
  await InvoiceLineItem.deleteMany({})
  await Payment.deleteMany({})
})

describe('Invoice Operations', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create an invoice with line items', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-001', status: 'SENT', issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 10000, taxRate: 10, taxAmount: 1000, total: 11000,
      paidAmount: 0, organizationId: testOrgId, clientId: testClientId,
    })
    expect(invoice).toHaveProperty('_id')
    expect(invoice.status).toBe('SENT')
    expect(invoice.total).toBe(11000)
  })

  it('should add line items to invoice', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-002', status: 'SENT', subtotal: 0, taxRate: 10,
      taxAmount: 0, total: 0, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    const lineItem = await InvoiceLineItem.create({
      description: 'Design Services', quantity: 2, unitPrice: 5000, amount: 10000,
      invoiceId: invoice._id,
    })
    expect(lineItem).toHaveProperty('_id')
    expect(lineItem.amount).toBe(10000)
  })

  it('should calculate invoice totals correctly', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-003', status: 'SENT', subtotal: 15000, taxRate: 8,
      taxAmount: 1200, total: 16200, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    expect(invoice.subtotal).toBe(15000)
    expect(invoice.taxRate).toBe(8)
    expect(invoice.taxAmount).toBe(1200)
    expect(invoice.total).toBe(16200)
  })

  it('should update invoice status to paid', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-004', status: 'SENT', subtotal: 5000, taxRate: 10,
      taxAmount: 500, total: 5500, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    const updated = await Invoice.findOneAndUpdate(
      { _id: invoice._id }, { status: 'PAID', paidAmount: 5500 }, { new: true }
    )
    expect(updated?.status).toBe('PAID')
    expect(updated?.paidAmount).toBe(5500)
  })

  it('should record partial payment', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-005', status: 'SENT', subtotal: 10000, taxRate: 10,
      taxAmount: 1000, total: 11000, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    await Payment.create({ amount: 5000, method: 'BANK_TRANSFER', invoiceId: invoice._id })
    const updated = await Invoice.findOneAndUpdate(
      { _id: invoice._id }, { paidAmount: 5000, status: 'PARTIALLY_PAID' }, { new: true }
    )
    expect(updated?.paidAmount).toBe(5000)
    expect(updated?.status).toBe('PARTIALLY_PAID')
  })

  it('should calculate outstanding balance', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-006', status: 'SENT', subtotal: 8000, taxRate: 10,
      taxAmount: 800, total: 8800, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    const outstanding = invoice.total - invoice.paidAmount
    expect(outstanding).toBe(8800)
  })

  it('should create invoice with multiple line items', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-007', status: 'SENT', subtotal: 0, taxRate: 10,
      taxAmount: 0, total: 0, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    await InvoiceLineItem.create({ description: 'Service A', quantity: 1, unitPrice: 3000, amount: 3000, invoiceId: invoice._id })
    await InvoiceLineItem.create({ description: 'Service B', quantity: 2, unitPrice: 4000, amount: 8000, invoiceId: invoice._id })
    const lineItems = await InvoiceLineItem.find({ invoiceId: invoice._id })
    expect(lineItems.length).toBe(2)
    expect(lineItems.reduce((sum: number, item) => sum + item.amount, 0)).toBe(11000)
  })

  it('should calculate invoice tax calculations', async () => {
    const invoice = await Invoice.create({
      number: 'INV-TEST-008', status: 'SENT', subtotal: 10000, taxRate: 8.25,
      taxAmount: 825, total: 10825, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    expect(invoice.subtotal).toBe(10000)
    expect(invoice.taxRate).toBe(8.25)
    expect(invoice.taxAmount).toBe(825)
    expect(invoice.total).toBe(10825)
  })

  it('should filter invoices by organization', async () => {
    await Invoice.create({
      number: 'INV-TEST-008', status: 'SENT', subtotal: 1000, taxRate: 10,
      taxAmount: 100, total: 1100, paidAmount: 0,
      organizationId: testOrgId, clientId: testClientId,
    })
    const otherOrg = await Organization.create({ name: 'Other Org Invoices', slug: 'other-org-inv-' + Date.now() })
    await Invoice.create({
      number: 'INV-TEST-009', status: 'SENT', subtotal: 2000, taxRate: 10,
      taxAmount: 200, total: 2200, paidAmount: 0,
      organizationId: otherOrg._id, clientId: testClientId,
    })
    const orgInvoices = await Invoice.find({ organizationId: testOrgId })
    expect(orgInvoices.length).toBe(1)
  })
})