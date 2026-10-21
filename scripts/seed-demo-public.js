/**
 * Public demo data seeding script.
 *
 * Creates the shared public reviewer account and realistic fictional data in a
 * dedicated demo database ONLY. This script MUST NOT run against production.
 *
 * Safety:
 *   - Requires DEMO_SEED_MONGODB_URI to be explicitly set.
 *   - Parses the URI and rejects if the database name is not exactly `clientflow_demo`.
 *   - Requires standard mongodb:// or mongodb+srv:// scheme.
 *   - Idempotent with safe retry: skips fully-seeded data, repairs partial seeds.
 *   - Never deletes or overwrites unrelated records.
 *   - The reviewer password is supplied via DEMO_REVIEWER_PASSWORD env var.
 *   - Requires CONFIRM_DEMO_SEED=YES to prevent accidental execution.
 *
 * Usage:
 *   CONFIRM_DEMO_SEED=YES \
 *   DEMO_SEED_MONGODB_URI=mongodb+srv://<user>:<pass>@host/clientflow_demo \
 *   DEMO_REVIEWER_PASSWORD="MyDemoPassword!2026" \
 *   node scripts/seed-demo-public.js
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

// ─── Safety: require explicit environment setup ───────────────────────────────

const demoUri = process.env.DEMO_SEED_MONGODB_URI
if (!demoUri) {
  console.error('❌ ERROR: DEMO_SEED_MONGODB_URI is not set.')
  console.error('   This script refuses to run without an explicit demo database URI.')
  console.error('   Set DEMO_SEED_MONGODB_URI to a dedicated demo database (e.g. clientflow_demo).')
  process.exit(1)
}

const demoPassword = process.env.DEMO_REVIEWER_PASSWORD
if (!demoPassword || demoPassword.length < 8) {
  console.error('❌ ERROR: DEMO_REVIEWER_PASSWORD must be set and at least 8 characters long.')
  console.error('   This password is never stored in source code and is only used at runtime.')
  process.exit(1)
}

// Explicit opt-in confirmation. This script performs database writes, so it
// requires an explicit `CONFIRM_DEMO_SEED=YES` to prevent accidental execution.
const confirmSeed = process.env.CONFIRM_DEMO_SEED
if (confirmSeed !== 'YES') {
  console.error('❌ ERROR: CONFIRM_DEMO_SEED must be set to YES to run the demo seed.')
  console.error('   This is an explicit opt-in guard to prevent accidental database writes.')
  console.error('   Example:')
  console.error('   CONFIRM_DEMO_SEED=YES DEMO_SEED_MONGODB_URI=... DEMO_REVIEWER_PASSWORD=... node scripts/seed-demo-public.js')
  process.exit(1)
}

// ─── URI Validation ────────────────────────────────────────────────────────────
// Validate scheme and database name before connecting. Log errors only on
// the database name — never echo back the full URI (credentials leak risk).

function validateUri(uri) {
  // Require standard MongoDB URI scheme.
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    console.error('❌ ERROR: URI must use mongodb:// or mongodb+srv:// scheme.')
    process.exit(1)
  }

  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/)
  if (!match) {
    console.error('❌ ERROR: Could not parse database name from URI.')
    process.exit(1)
  }
  return { dbName: match[1] }
}

const { dbName } = validateUri(demoUri)
if (dbName !== 'clientflow_demo') {
  console.error('❌ ERROR: Database name must be exactly `clientflow_demo`.')
  console.error(`   Current database name does not match.`)
  console.error('   This safeguard prevents accidental seeding against a wrong database.')
  process.exit(1)
}

console.log('✅ Safety checks passed.')
console.log(`   Target database: ${dbName}`)
console.log('')

// ─── Connect ───────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(demoUri)
  console.log('Connected to demo database.')

  const { User } = await import('../src/lib/mongoose/user.ts')
  const { Organization } = await import('../src/lib/mongoose/organization.ts')
  const { Membership } = await import('../src/lib/mongoose/membership.ts')
  const { Client } = await import('../src/lib/mongoose/client.ts')
  const { Lead } = await import('../src/lib/mongoose/lead.ts')
  const { Project } = await import('../src/lib/mongoose/project.ts')
  const { Task } = await import('../src/lib/mongoose/task.ts')
  const { Invoice } = await import('../src/lib/mongoose/invoice.ts')
  const { InvoiceLineItem } = await import('../src/lib/mongoose/invoice-line-item.ts')
  const { Payment } = await import('../src/lib/mongoose/payment.ts')

  // ─── Idempotency & Retry: find or create org + reviewer ────────────────────
  let org = await Organization.findOne({ name: 'ClientFlow Demo Agency' })
  if (org) {
    console.log(`Found existing org: ${org.name} (${org._id})`)
  } else {
    org = await Organization.create({
      name: 'ClientFlow Demo Agency',
      slug: `clientflow-demo-${Date.now()}`,
    })
    console.log(`Created org: ${org.name} (${org._id})`)
  }

  let reviewer = await User.findOne({ email: 'reviewer@clientflow.test' }).lean()
  if (reviewer) {
    // Verify membership exists; repair if missing (partial seed recovery).
    let mem = await Membership.findOne({ userId: reviewer._id, organizationId: org._id })
    if (!mem) {
      await Membership.create({ userId: reviewer._id, organizationId: org._id, role: 'MEMBER' })
      console.log('Reppaired missing membership for reviewer.')
    }
    console.log(`Reviewer exists: reviewer@clientflow.test (role: MEMBER)`)
  } else {
    const hashedPassword = await bcrypt.hash(demoPassword, 12)
    reviewer = await User.create({
      email: 'reviewer@clientflow.test',
      name: 'Demo Reviewer',
      password: hashedPassword,
      role: 'MEMBER',
    })
    await Membership.create({ userId: reviewer._id, organizationId: org._id, role: 'MEMBER' })
    console.log(`Created reviewer: reviewer@clientflow.test (role: MEMBER)`)
  }

  // If already fully seeded (has all the expected child records), skip silently.
  const clientCount = await Client.countDocuments({ organizationId: org._id })
  const leadCount = await Lead.countDocuments({ organizationId: org._id })
  const projectCount = await Project.countDocuments({ organizationId: org._id })
  const invoiceCount = await Invoice.countDocuments({ organizationId: org._id })

  if (clientCount >= 4 && leadCount >= 3 && projectCount >= 4 && invoiceCount >= 3) {
    console.log('All demo data already present — skipping (idempotent).')
    await mongoose.disconnect()
    return
  }

  console.log('Seeding public demo data (all fictional)...')

  // ─── Create fictional clients (skip duplicates) ───────────────────────────
  const clientDefs = [
    { firstName: 'Alice', lastName: 'Johnson', companyName: 'TechStart Inc', email: 'alice@techstart.demo', phone: '+1 555-0101', website: 'https://techstart.demo', status: 'active' },
    { firstName: 'Bob', lastName: 'Smith', companyName: 'MediaWorks LLC', email: 'bob@mediaworks.demo', phone: '+1 555-0102', website: 'https://mediaworks.demo', status: 'active' },
    { firstName: 'Carol', lastName: 'Davis', companyName: 'GreenBuild Co', email: 'carol@greenbuild.demo', phone: '+1 555-0103', website: 'https://greenbuild.demo', status: 'prospect' },
    { firstName: 'David', lastName: 'Lee', companyName: 'SolarPower Systems', email: 'david@solarpower.demo', phone: '+1 555-0104', website: 'https://solarpower.demo', status: 'active' },
  ]
  const clients = []
  for (const def of clientDefs) {
    const existing = await Client.findOne({ email: def.email, organizationId: org._id })
    if (existing) {
      clients.push(existing)
    } else {
      const c = await Client.create({ ...def, organizationId: org._id, createdById: reviewer._id })
      clients.push(c)
    }
  }
  console.log(`Clients: ${clients.length} demo clients.`)

  // ─── Create fictional leads (skip duplicates) ─────────────────────────────
  const leadDefs = [
    { title: 'E-commerce platform redesign', description: 'Full stack rebuild for retail giant', email: 'contact@retailgiant.demo', stage: 'NEW', value: 50000, source: 'WEBSITE' },
    { title: 'Mobile app development', description: 'iOS and Android native app', email: 'dev@startupx.demo', stage: 'QUALIFIED', value: 80000, source: 'REFERRAL' },
    { title: 'Marketing automation setup', description: 'HubSpot integration and workflows', email: 'growth@growthco.demo', stage: 'PROPOSAL_SENT', value: 25000, source: 'EMAIL' },
  ]
  for (const def of leadDefs) {
    const existing = await Lead.findOne({ title: def.title, organizationId: org._id })
    if (existing) continue
    await Lead.create({ ...def, organizationId: org._id, createdById: reviewer._id })
  }
  console.log(`Leads seeded.`)

  // ─── Create fictional projects (skip duplicates) ──────────────────────────
  const projectDefs = [
    { name: 'TechStart Website Redesign', description: 'Complete brand refresh and new website', status: 'ACTIVE', priority: 'HIGH', budget: 15000, startDate: new Date('2026-01-15'), endDate: new Date('2026-04-15') },
    { name: 'MediaWorks Dashboard', description: 'Internal analytics and reporting dashboard', status: 'ACTIVE', priority: 'MEDIUM', budget: 25000, startDate: new Date('2026-02-01'), endDate: new Date('2026-06-01') },
    { name: 'GreenBuild Branding', description: 'Logo, brand guidelines, and marketing assets', status: 'COMPLETED', priority: 'HIGH', budget: 8000, startDate: new Date('2025-11-01'), endDate: new Date('2026-01-31') },
    { name: 'SolarPower CRM Integration', description: 'Salesforce integration and workflow automation', status: 'DRAFT', priority: 'MEDIUM', budget: 35000, startDate: null, endDate: null },
  ]
  for (const def of projectDefs) {
    const existing = await Project.findOne({ name: def.name, organizationId: org._id })
    if (existing) continue
    await Project.create({ ...def, organizationId: org._id, clientId: clients[projectDefs.indexOf(def)]?._id ?? null, createdById: reviewer._id })
  }
  console.log(`Projects seeded.`)

  // ─── Create fictional tasks (skip duplicates) ─────────────────────────────
  const tasks = await Promise.all([
    Task.findOne({ title: 'Design homepage mockup', organizationId: org._id }),
    Task.findOne({ title: 'Set up CI/CD pipeline', organizationId: org._id }),
    Task.findOne({ title: 'Write API documentation', organizationId: org._id }),
    Task.findOne({ title: 'Fix mobile responsiveness', organizationId: org._id }),
    Task.findOne({ title: 'Set up email templates', organizationId: org._id }),
  ])
  const taskDefs = [
    { title: 'Design homepage mockup', status: 'DONE', priority: 'HIGH', projectId: null, assigneeId: reviewer._id, dueDate: new Date('2026-02-01'), completedAt: new Date('2026-02-01') },
    { title: 'Set up CI/CD pipeline', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: null, assigneeId: reviewer._id, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    { title: 'Write API documentation', status: 'BACKLOG', priority: 'LOW', projectId: null, assigneeId: null, dueDate: null },
    { title: 'Fix mobile responsiveness', status: 'IN_REVIEW', priority: 'HIGH', projectId: null, assigneeId: reviewer._id, dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    { title: 'Set up email templates', status: 'BACKLOG', priority: 'MEDIUM', projectId: null, assigneeId: null, dueDate: null },
  ]
  for (let i = 0; i < taskDefs.length; i++) {
    if (tasks[i]) continue
    await Task.create({ ...taskDefs[i], organizationId: org._id })
  }
  console.log(`Tasks seeded.`)

  // ─── Create fictional invoices (reconcile by number, then line items + payments) ──
  const invoiceDefs = [
    { number: 'INV-2026-0001', clientId: clients[0]._id, status: 'PAID', issueDate: new Date('2026-01-15'), dueDate: new Date('2026-02-15'), subtotal: 12000, taxRate: 10, total: 13200, paidAmount: 13200, notes: 'Website redesign - milestone 1' },
    { number: 'INV-2026-0002', clientId: clients[1]._id, status: 'SENT', issueDate: new Date('2026-03-01'), dueDate: new Date('2026-03-31'), subtotal: 20000, taxRate: 10, total: 22000, paidAmount: 0, notes: 'Dashboard development - monthly retainer' },
    { number: 'INV-2026-0003', clientId: clients[2]._id, status: 'OVERDUE', issueDate: new Date('2026-01-01'), dueDate: new Date('2026-01-31'), subtotal: 7000, taxRate: 0, total: 7000, paidAmount: 0, notes: 'Branding package - overdue' },
  ]
  for (const def of invoiceDefs) {
    // Find or create the invoice by its unique number. Never delete or overwrite.
    let invoice = await Invoice.findOne({ number: def.number })
    if (!invoice) {
      invoice = await Invoice.create({ ...def, organizationId: org._id })
    }

    // Reconcile line items and payments for this invoice regardless of whether
    // the invoice was just created or already existed. This handles partial-seed
    // recovery: if a previous run created the invoice but failed at the payment
    // step, the missing payment is created here without duplicating anything.
    if (def.number === 'INV-2026-0001') {
      const existingLIs = await InvoiceLineItem.find({ invoiceId: invoice._id }).lean()
      const expectedLIs = [
        { description: 'UI/UX Design', quantity: 1, unitPrice: 8000, amount: 8000 },
        { description: 'Frontend Development', quantity: 40, unitPrice: 100, amount: 4000 },
      ]
      for (const exp of expectedLIs) {
        if (existingLIs.some(li => li.description === exp.description)) continue
        await InvoiceLineItem.create({ ...exp, invoiceId: invoice._id })
      }
      // Payment keyed by reference (WIRE-001) — unique per invoice in this seed.
      const existingPayment = await Payment.findOne({ invoiceId: invoice._id, reference: 'WIRE-001' })
      if (!existingPayment) {
        await Payment.create({ amount: 13200, date: new Date('2026-02-10'), method: 'BANK_TRANSFER', reference: 'WIRE-001', invoiceId: invoice._id, organizationId: org._id })
      }
    } else if (def.number === 'INV-2026-0002') {
      const existingLIs = await InvoiceLineItem.find({ invoiceId: invoice._id }).lean()
      if (!existingLIs.some(li => li.description === 'Dashboard Development')) {
        await InvoiceLineItem.create({ description: 'Dashboard Development', quantity: 80, unitPrice: 250, amount: 20000, invoiceId: invoice._id })
      }
    } else if (def.number === 'INV-2026-0003') {
      const existingLIs = await InvoiceLineItem.find({ invoiceId: invoice._id }).lean()
      if (!existingLIs.some(li => li.description === 'Logo Design')) {
        await InvoiceLineItem.create({ description: 'Logo Design', quantity: 1, unitPrice: 3000, amount: 3000, invoiceId: invoice._id })
      }
      if (!existingLIs.some(li => li.description === 'Brand Guidelines')) {
        await InvoiceLineItem.create({ description: 'Brand Guidelines', quantity: 1, unitPrice: 4000, amount: 4000, invoiceId: invoice._id })
      }
    }
  }
  console.log(`Invoices seeded.`)

  console.log('\n✅ Demo data ready!')
  console.log('   Email:    reviewer@clientflow.test')
  console.log('   Password: (supplied via DEMO_REVIEWER_PASSWORD env var)')
  console.log('   Role:     MEMBER (read-only on shared demo data)')
  console.log(`   Database: ${dbName}`)
  console.log('')
  console.log('   The reviewer account can sign in and browse all demo content,')
  console.log('   but cannot create, update, or delete any records.')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
