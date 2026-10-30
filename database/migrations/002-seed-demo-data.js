/**
 * Migration 002: Seed demo data (safe, idempotent, never overwrites).
 *
 * Creates realistic but entirely fake demo data only if collections are empty.
 * Never touches real user data. Safe to run against a fresh database.
 *
 * IMPORTANT: This script must NEVER be invoked automatically during deployment
 * or app startup. It is explicitly meant for demonstration purposes only.
 *
 * Safety:
 *   - Uses the shared URI validator (from src/lib/seed/shared.ts) to refuse
 *     remote/production hosts.
 *   - Idempotent: re-running does not create duplicates.
 *   - Passwords are generated at runtime — never hardcoded.
 *
 * Usage (from project root):
 *   node database/migrations/002-seed-demo-data.js
 *
 * Requires MONGODB_URI pointing to a non-production database.
 */
import mongoose from 'mongoose'
import { randomBytes } from 'crypto'
import {
  hashPassword,
  validateSeedUri,
  findOrCreateUser,
  findOrCreateOrganization,
} from '../src/lib/seed/shared.ts'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

// ─── URI Validation ────────────────────────────────────────────────────────────
// Shared validator enforces scheme, host allowlist, and (optionally) database name.
// Never echo back the full URI — credentials leak risk.
const validation = validateSeedUri(MONGODB_URI)
if (!validation.ok) {
  console.error(`❌ ERROR: ${validation.error}`)
  console.error('   Set MONGODB_URI to a local or test database (localhost / 127.0.0.1) and run again.')
  process.exit(1)
}

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  // Import models after connection for dynamic resolution
  const { Organization } = await import('../src/lib/mongoose/organization.ts')
  const { Membership } = await import('../src/lib/mongoose/membership.ts')
  const { User } = await import('../src/lib/mongoose/user.ts')
  const { Client } = await import('../src/lib/mongoose/client.ts')
  const { Lead } = await import('../src/lib/mongoose/lead.ts')
  const { Project } = await import('../src/lib/mongoose/project.ts')
  const { Task } = await import('../src/lib/mongoose/task.ts')
  const { Invoice } = await import('../src/lib/mongoose/invoice.ts')
  const { InvoiceLineItem } = await import('../src/lib/mongoose/invoice-line-item.ts')

  // Idempotency: skip if any user already exists
  const existingUser = await User.findOne().lean()
  if (existingUser) {
    console.log('User already exists — skipping seed (idempotent).')
    await mongoose.disconnect()
    return
  }

  console.log('Seeding demo data (all fake)...')

  // Create org (idempotent — find-or-create by name)
  const org = await findOrCreateOrganization(Organization, 'Demo Agency', 'demo')
  console.log(`Org: ${org.name} (${org._id})`)

  // Generate a random demo password at runtime — never hardcode one
  const passwordBytes = randomBytes(16)
  const demoPassword = `demo-${passwordBytes.toString('hex')}`
  const hashedPassword = await hashPassword(demoPassword)

  // Demo admin user (find-or-create by email)
  const admin = await findOrCreateUser(User, {
    email: 'admin@demoagency.test',
    name: 'Demo Admin',
    role: 'ADMIN',
    passwordHash: hashedPassword,
  })
  await Membership.create({ userId: admin._id, organizationId: org._id, role: 'ADMIN' })

  // Demo member user
  const member = await findOrCreateUser(User, {
    email: 'member@demoagency.test',
    name: 'Demo Member',
    role: 'MEMBER',
    passwordHash: hashedPassword,
  })
  await Membership.create({ userId: member._id, organizationId: org._id, role: 'MEMBER' })
  console.log(`Created admin and member accounts.`)

  // Demo clients
  const clients = await Promise.all([
    Client.create({ firstName: 'Alice', lastName: 'Johnson', companyName: 'TechStart Inc', email: 'alice@techstart.test', organizationId: org._id, status: 'active', createdById: admin._id }),
    Client.create({ firstName: 'Bob', lastName: 'Smith', companyName: 'MediaWorks LLC', email: 'bob@mediaworks.test', organizationId: org._id, status: 'active', createdById: admin._id }),
    Client.create({ firstName: 'Carol', lastName: 'Davis', companyName: 'GreenBuild Co', email: 'carol@greenbuild.test', organizationId: org._id, status: 'prospect', createdById: admin._id }),
  ])
  console.log(`Created ${clients.length} demo clients.`)

  // Demo leads
  const leads = await Promise.all([
    Lead.create({ title: 'E-commerce platform redesign', description: 'Full stack rebuild', email: 'contact@retailgiant.test', stage: 'NEW', value: 50000, source: 'WEBSITE', organizationId: org._id, createdById: admin._id }),
    Lead.create({ title: 'Mobile app development', description: 'iOS and Android', email: 'dev@startupx.test', stage: 'QUALIFIED', value: 80000, source: 'REFERRAL', organizationId: org._id, createdById: admin._id }),
  ])
  console.log(`Created ${leads.length} demo leads.`)

  // Demo projects
  const projects = await Promise.all([
    Project.create({ name: 'TechStart Website', description: 'Corporate website redesign', status: 'ACTIVE', priority: 'HIGH', budget: 15000, startDate: new Date(), endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), organizationId: org._id, clientId: clients[0]._id, createdById: admin._id }),
    Project.create({ name: 'MediaWorks Dashboard', description: 'Internal analytics dashboard', status: 'DRAFT', priority: 'MEDIUM', budget: 25000, organizationId: org._id, clientId: clients[1]._id, createdById: admin._id }),
  ])
  console.log(`Created ${projects.length} demo projects.`)

  // Demo tasks
  await Promise.all([
    Task.create({ title: 'Design homepage mockup', description: 'Figma prototype', status: 'DONE', priority: 'HIGH', projectId: projects[0]._id, assigneeId: member._id, dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), organizationId: org._id }),
    Task.create({ title: 'Set up CI/CD pipeline', description: 'GitHub Actions for deployment', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: projects[0]._id, assigneeId: member._id, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), organizationId: org._id }),
    Task.create({ title: 'Write API documentation', description: 'OpenAPI spec', status: 'BACKLOG', priority: 'LOW', projectId: projects[1]._id, organizationId: org._id }),
  ])
  console.log('Created demo tasks.')

  // Demo invoice
  const invoice = await Invoice.create({
    number: 'INV-2026-0001',
    clientId: clients[0]._id,
    status: 'SENT',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    subtotal: 12000,
    taxRate: 10,
    taxAmount: 1200,
    total: 13200,
    paidAmount: 0,
    organizationId: org._id,
  })
  await InvoiceLineItem.create({ description: 'Website design', quantity: 1, unitPrice: 8000, amount: 8000, invoiceId: invoice._id })
  await InvoiceLineItem.create({ description: 'Development', quantity: 40, unitPrice: 100, amount: 4000, invoiceId: invoice._id })
  console.log('Created demo invoice.')

  console.log('\n✅ Demo data seeded successfully!')
  console.log('   Admin:  admin@demoagency.test')
  console.log('   Member: member@demoagency.test')
  console.log(`   Password: ${demoPassword}  (generated at runtime — not in source code)`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
