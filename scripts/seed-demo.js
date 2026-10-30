/**
 * Safe, explicit demo seed script.
 *
 * Runs ONLY when invoked directly. Never auto-executes during build or start.
 * Creates fake demo data without overwriting existing records.
 * Refuses to run against production (Atlas) URIs.
 *
 * Usage:
 *   node scripts/seed-demo.js
 *
 * Or with a specific database:
 *   MONGODB_URI=mongodb://localhost:27017/clientflow-demo node scripts/seed-demo.js
 */
import mongoose from 'mongoose'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

// Safety: refuse production URIs
const hostnameMatch = MONGODB_URI.match(/@([^./]+)/)
if (hostnameMatch) {
  const hostname = hostnameMatch[1]
  if (hostname.includes('atlas') || hostname.includes('cluster')) {
    console.error('❌ PRODUCTION PROTECTED: refusing to seed against production MongoDB.')
    process.exit(1)
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI)

  const { User } = await import('../src/lib/mongoose/user.ts')
  const { Organization } = await import('../src/lib/mongoose/organization.ts')
  const { Membership } = await import('../src/lib/mongoose/membership.ts')
  const { Client } = await import('../src/lib/mongoose/client.ts')
  const { Lead } = await import('../src/lib/mongoose/lead.ts')
  const { Project } = await import('../src/lib/mongoose/project.ts')
  const { Task } = await import('../src/lib/mongoose/task.ts')
  const { Invoice } = await import('../src/lib/mongoose/invoice.ts')
  const { InvoiceLineItem } = await import('../src/lib/mongoose/invoice-line-item.ts')

  // Idempotent: skip if users exist
  const existing = await User.findOne().lean()
  if (existing) {
    console.log('Users already exist — skipping demo seed.')
    await mongoose.disconnect()
    return
  }

  const passwordBytes = randomBytes(16)
  const demoPassword = `demo-${passwordBytes.toString('hex')}`
  const hashed = await hash(demoPassword, 12)

  const org = await Organization.create({ name: 'Demo Agency', slug: `demo-${Date.now()}` })
  const admin = await User.create({ email: 'admin@demo.test', name: 'Demo Admin', password: hashed, role: 'ADMIN' })
  await Membership.create({ userId: admin._id, organizationId: org._id, role: 'ADMIN' })

  const client = await Client.create({ firstName: 'Demo', lastName: 'Corp', companyName: 'Demo Corp', email: 'demo@democorp.test', organizationId: org._id, createdById: admin._id })
  await Lead.create({ title: 'Demo Lead', description: 'Test lead', email: 'lead@demo.test', stage: 'NEW', organizationId: org._id, createdById: admin._id })
  const project = await Project.create({ name: 'Demo Project', description: 'Test project', status: 'ACTIVE', priority: 'MEDIUM', organizationId: org._id, clientId: client._id, createdById: admin._id })
  await Task.create({ title: 'Demo Task', description: 'Test task', status: 'BACKLOG', priority: 'LOW', organizationId: org._id, projectId: project._id })
  const invoice = await Invoice.create({ number: 'INV-DEMO-001', clientId: client._id, status: 'DRAFT', organizationId: org._id, subtotal: 1000, taxRate: 0, taxAmount: 0, total: 1000, paidAmount: 0 })
  await InvoiceLineItem.create({ description: 'Demo line item', quantity: 1, unitPrice: 1000, amount: 1000, invoiceId: invoice._id })

  console.log(`✅ Demo data created. Login: admin@demo.test / ${demoPassword}`)
  await mongoose.disconnect()
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1) })