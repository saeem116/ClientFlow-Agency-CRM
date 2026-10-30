/**
 * Safe demo seed script for local development.
 *
 * Creates minimal demo data (1 org, 1 admin user, sample client/project/task/invoice)
 * in a local/test MongoDB instance.
 *
 * Safety:
 *   - Refuses to run against production URIs (host allowlist).
 *   - Skips if any user already exists (idempotent).
 *   - Passwords are generated at runtime — never hardcoded.
 *
 * Usage:
 *   node scripts/seed-demo.js
 *
 * Or with a specific database:
 *   MONGODB_URI=mongodb://localhost:27017/clientflow-dev node scripts/seed-demo.js
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
const validation = validateSeedUri(MONGODB_URI)
if (!validation.ok) {
  console.error(`❌ ERROR: ${validation.error}`)
  console.error('   Ensure MONGODB_URI points to a local or test database.')
  console.error('   Example: MONGODB_URI=mongodb://localhost:27017/clientflow-dev')
  process.exit(1)
}

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to database.')

  // Import models after connection
  const { User } = await import('../src/lib/mongoose/user.ts')
  const { Organization } = await import('../src/lib/mongoose/organization.ts')
  const { Membership } = await import('../src/lib/mongoose/membership.ts')
  const { Client } = await import('../src/lib/mongoose/client.ts')
  const { Lead } = await import('../src/lib/mongoose/lead.ts')
  const { Project } = await import('../src/lib/mongoose/project.ts')
  const { Task } = await import('../src/lib/mongoose/task.ts')
  const { Invoice } = await import('../src/lib/mongoose/invoice.ts')
  const { InvoiceLineItem } = await import('../src/lib/mongoose/invoice-line-item.ts')

  // Idempotency: skip if users exist
  const existing = await User.findOne().lean()
  if (existing) {
    console.log('Users already exist — skipping demo seed.')
    await mongoose.disconnect()
    return
  }

  // Create organization
  const org = await findOrCreateOrganization(Organization, 'Demo Agency', 'demo')
  console.log(`Created organization: ${org.name} (${org._id})`)

  // Generate password at runtime — never hardcode one
  const passwordBytes = randomBytes(16)
  const demoPassword = `demo-${passwordBytes.toString('hex')}`
  const hashedPassword = await hashPassword(demoPassword)

  // Create admin user
  const admin = await findOrCreateUser(User, {
    email: 'admin@demo.test',
    name: 'Demo Admin',
    role: 'ADMIN',
    passwordHash: hashedPassword,
  })
  console.log(`Created user: ${admin.email} (${admin._id})`)
  console.log(`   Password: ${demoPassword}`)

  // Create membership
  await Membership.create({
    userId: admin._id,
    organizationId: org._id,
    role: 'ADMIN',
  })
  console.log('Created membership.')

  // Create sample client
  const client = await Client.create({
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Acme Corp',
    email: 'john@acme.com',
    phone: '+1 (555) 123-4567',
    status: 'active',
    organizationId: org._id,
    createdById: admin._id,
  })
  console.log('Created sample client.')

  // Create sample lead
  await Lead.create({
    title: 'Website Redesign for Acme',
    description: 'Complete website redesign project',
    email: 'john@acme.com',
    stage: 'NEW',
    value: 25000,
    source: 'REFERRAL',
    organizationId: org._id,
    createdById: admin._id,
  })
  console.log('Created sample lead.')

  // Create sample project
  const project = await Project.create({
    name: 'Acme Website Redesign',
    description: 'Full website redesign with new branding',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 25000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    organizationId: org._id,
    clientId: client._id,
    createdById: admin._id,
  })
  console.log('Created sample project.')

  // Create sample task
  await Task.create({
    title: 'Design homepage mockup',
    description: 'Figma prototype',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    projectId: project._id,
    organizationId: org._id,
  })
  console.log('Created sample task.')

  // Create sample invoice
  const invoice = await Invoice.create({
    number: 'INV-DEMO-001',
    clientId: client._id,
    status: 'DRAFT',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    subtotal: 10000,
    taxRate: 10,
    taxAmount: 1000,
    total: 11000,
    paidAmount: 0,
    organizationId: org._id,
  })
  await InvoiceLineItem.create({
    description: 'Website design',
    quantity: 1,
    unitPrice: 10000,
    amount: 10000,
    invoiceId: invoice._id,
  })
  console.log('Created sample invoice.')

  console.log('\n✅ Demo data created successfully!')
  console.log(`   Email:    admin@demo.test`)
  console.log(`   Password: ${demoPassword}`)
  console.log('')
  console.log('   The password was generated at runtime and is not stored in source code.')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
