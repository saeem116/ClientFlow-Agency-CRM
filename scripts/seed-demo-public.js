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
 *   - Idempotent: re-running does not create duplicates. Uses find-or-create by
 *     stable keys (email for clients/users, title for leads/projects, number for
 *     invoices, title for tasks/milestones).
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

// Prefer the explicit DEMO_SEED_MONGODB_URI, fall back to DEMO_MONGODB_URI
// (the same var the app uses for the demo connection) so the seed targets the
// same database the reviewer account logs into.
const demoUri = process.env.DEMO_SEED_MONGODB_URI || process.env.DEMO_MONGODB_URI
if (!demoUri) {
  console.error('❌ ERROR: DEMO_SEED_MONGODB_URI (or DEMO_MONGODB_URI) is not set.')
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
  const { Milestone } = await import('../src/lib/mongoose/milestone.ts')
  const { Invoice } = await import('../src/lib/mongoose/invoice.ts')
  const { InvoiceLineItem } = await import('../src/lib/mongoose/invoice-line-item.ts')
  const { Payment } = await import('../src/lib/mongoose/payment.ts')
  const { Activity } = await import('../src/lib/mongoose/activity.ts')
  const { Notification } = await import('../src/lib/mongoose/notification.ts')

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
      console.log('Repaired missing membership for reviewer.')
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

  // Idempotency: if the demo data is already fully present, skip silently.
  const clientCount = await Client.countDocuments({ organizationId: org._id })
  const leadCount = await Lead.countDocuments({ organizationId: org._id })
  const projectCount = await Project.countDocuments({ organizationId: org._id })
  const invoiceCount = await Invoice.countDocuments({ organizationId: org._id })

  if (
    clientCount >= 8 &&
    leadCount >= 8 &&
    projectCount >= 6 &&
    invoiceCount >= 6 &&
    process.env.DEMO_FORCE_SEED !== 'YES'
  ) {
    console.log('All demo data already present — skipping (idempotent).')
    await mongoose.disconnect()
    return
  }
  if (process.env.DEMO_FORCE_SEED === 'YES') {
    console.log('DEMO_FORCE_SEED=YES — re-seeding demo data (reconciling dates/records).')
  }

  console.log('Seeding public demo data (all fictional)...')

  // ─── Create fictional clients (skip duplicates) ───────────────────────────
  const clientDefs = [
    { firstName: 'Alice', lastName: 'Johnson', companyName: 'TechStart Inc', email: 'alice@techstart.demo', phone: '+1 555-0101', website: 'https://techstart.demo', status: 'active' },
    { firstName: 'Bob', lastName: 'Smith', companyName: 'MediaWorks LLC', email: 'bob@mediaworks.demo', phone: '+1 555-0102', website: 'https://mediaworks.demo', status: 'active' },
    { firstName: 'Carol', lastName: 'Davis', companyName: 'GreenBuild Co', email: 'carol@greenbuild.demo', phone: '+1 555-0103', website: 'https://greenbuild.demo', status: 'prospect' },
    { firstName: 'David', lastName: 'Lee', companyName: 'SolarPower Systems', email: 'david@solarpower.demo', phone: '+1 555-0104', website: 'https://solarpower.demo', status: 'active' },
    { firstName: 'Elena', lastName: 'Rossi', companyName: 'Apex Retail Group', email: 'elena@apexretail.demo', phone: '+1 555-0105', website: 'https://apexretail.demo', status: 'active' },
    { firstName: 'Frank', lastName: 'Miller', companyName: 'BlueHorizon Logistics', email: 'frank@bluehorizon.demo', phone: '+1 555-0106', website: 'https://bluehorizon.demo', status: 'inactive' },
    { firstName: 'Grace', lastName: 'Kim', companyName: 'Nimbus Design Studio', email: 'grace@nimbus.demo', phone: '+1 555-0107', website: 'https://nimbus.demo', status: 'active' },
    { firstName: 'Henry', lastName: 'Okafor', companyName: 'Summit Construction', email: 'henry@summit.demo', phone: '+1 555-0108', website: 'https://summit.demo', status: 'active' },
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
    { title: 'Brand refresh for non-profit', description: 'Visual identity and website for community org', email: 'hello@community.org', stage: 'CONTACTED', value: 12000, source: 'WEBSITE' },
    { title: 'SaaS dashboard migration', description: 'Legacy to modern cloud dashboard', email: 'ops@saasco.demo', stage: 'NEW', value: 60000, source: 'REFERRAL' },
    { title: 'Landing page campaign', description: 'Product launch landing page + analytics', email: 'marketing@launchco.demo', stage: 'WON', value: 18000, source: 'EMAIL' },
    { title: 'API integration', description: 'Third-party payment gateway integration', email: 'tech@paydemo.demo', stage: 'LOST', value: 9000, source: 'PHONE' },
    { title: 'Internal tooling audit', description: 'Review and optimize internal admin tools', email: 'cto@enterprise.demo', stage: 'QUALIFIED', value: 45000, source: 'REFERRAL' },
  ]
  const leads = []
  for (const def of leadDefs) {
    const existing = await Lead.findOne({ title: def.title, organizationId: org._id })
    if (existing) {
      leads.push(existing)
    } else {
      const l = await Lead.create({ ...def, organizationId: org._id, createdById: reviewer._id })
      leads.push(l)
    }
  }
  console.log(`Leads: ${leads.length} demo leads.`)

  // ─── Create fictional projects (skip duplicates) ──────────────────────────
  const now = new Date()
  const plusDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
  const minusDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  const projectDefs = [
    { name: 'TechStart Website Redesign', description: 'Complete brand refresh and new website', status: 'ACTIVE', priority: 'HIGH', budget: 15000, startDate: new Date('2026-01-15'), endDate: new Date('2026-04-15'), client: clients[0] },
    { name: 'MediaWorks Dashboard', description: 'Internal analytics and reporting dashboard', status: 'ACTIVE', priority: 'MEDIUM', budget: 25000, startDate: new Date('2026-02-01'), endDate: new Date('2026-06-01'), client: clients[1] },
    { name: 'GreenBuild Branding', description: 'Logo, brand guidelines, and marketing assets', status: 'COMPLETED', priority: 'HIGH', budget: 8000, startDate: new Date('2025-11-01'), endDate: new Date('2026-01-31'), client: clients[2] },
    { name: 'SolarPower CRM Integration', description: 'Salesforce integration and workflow automation', status: 'DRAFT', priority: 'MEDIUM', budget: 35000, startDate: null, endDate: null, client: clients[3] },
    { name: 'Apex Retail E-commerce', description: 'Online store with inventory management', status: 'ACTIVE', priority: 'HIGH', budget: 42000, startDate: new Date('2026-03-01'), endDate: new Date('2026-08-31'), client: clients[4] },
    { name: 'Nimbus Design Portfolio', description: 'Creative portfolio site and case studies', status: 'ON_HOLD', priority: 'LOW', budget: 6000, startDate: new Date('2026-01-10'), endDate: new Date('2026-02-28'), client: clients[6] },
  ]
  const projects = []
  for (const def of projectDefs) {
    const existing = await Project.findOne({ name: def.name, organizationId: org._id })
    if (existing) {
      projects.push(existing)
    } else {
      const p = await Project.create({
        ...def,
        clientId: def.client._id,
        organizationId: org._id,
        createdById: reviewer._id,
      })
      projects.push(p)
    }
  }
  console.log(`Projects: ${projects.length} demo projects.`)

  // ─── Create milestones linked to projects (skip duplicates) ────────────────
  const milestoneDefs = [
    { title: 'Discovery & requirements', description: 'Stakeholder interviews and scope definition', dueDate: minusDays(30), completedAt: minusDays(25), project: projects[0] },
    { title: 'Wireframes & UX mockups', description: 'Low-fidelity wireframes and user flow review', dueDate: minusDays(15), completedAt: minusDays(12), project: projects[0] },
    { title: 'Frontend implementation', description: 'React component build and responsive layout', dueDate: plusDays(15), completedAt: null, project: projects[0] },
    { title: 'Backend API integration', description: 'Connect frontend to reporting API', dueDate: plusDays(30), completedAt: null, project: projects[1] },
    { title: 'Logo design & brand guide', description: 'Primary logo, color palette, typography', dueDate: minusDays(45), completedAt: minusDays(40), project: projects[2] },
    { title: 'Marketing collateral', description: 'Business cards, letterhead, social assets', dueDate: minusDays(10), completedAt: minusDays(5), project: projects[2] },
    { title: 'Schema design', description: 'CRM data model and relationship mapping', dueDate: plusDays(20), completedAt: null, project: projects[3] },
    { title: 'Product catalog setup', description: 'Import and categorize retail inventory', dueDate: plusDays(45), completedAt: null, project: projects[4] },
    { title: 'Portfolio gallery', description: 'Case study layout and image optimization', dueDate: minusDays(5), completedAt: null, project: projects[5] },
  ]
  for (const def of milestoneDefs) {
    const existing = await Milestone.findOne({ title: def.title, projectId: def.project._id })
    if (!existing) {
      await Milestone.create({
        title: def.title,
        description: def.description,
        dueDate: def.dueDate,
        completedAt: def.completedAt,
        projectId: def.project._id,
      })
    }
  }
  const milestoneCount = await Milestone.countDocuments({ projectId: { $in: projects.map(p => p._id) } })
  console.log(`Milestones: ${milestoneCount} demo milestones.`)

  // ─── Create fictional tasks (skip duplicates) ─────────────────────────────
  const taskDefs = [
    { title: 'Design homepage mockup', status: 'DONE', priority: 'HIGH', project: projects[0], assignee: reviewer, dueDate: minusDays(30), completedAt: minusDays(28) },
    { title: 'Set up CI/CD pipeline', status: 'IN_PROGRESS', priority: 'MEDIUM', project: projects[0], assignee: reviewer, dueDate: plusDays(14), completedAt: null },
    { title: 'Write API documentation', status: 'BACKLOG', priority: 'LOW', project: null, assignee: null, dueDate: null, completedAt: null },
    { title: 'Fix mobile responsiveness', status: 'IN_REVIEW', priority: 'HIGH', project: projects[0], assignee: reviewer, dueDate: minusDays(7), completedAt: null },
    { title: 'Set up email templates', status: 'BACKLOG', priority: 'MEDIUM', project: null, assignee: null, dueDate: null, completedAt: null },
    { title: 'Create dashboard wireframes', status: 'DONE', priority: 'HIGH', project: projects[1], assignee: reviewer, dueDate: minusDays(10), completedAt: minusDays(5) },
    { title: 'Implement chart components', status: 'IN_PROGRESS', priority: 'HIGH', project: projects[1], assignee: null, dueDate: plusDays(10), completedAt: null },
    { title: 'Export to CSV feature', status: 'BACKLOG', priority: 'LOW', project: projects[1], assignee: null, dueDate: plusDays(21), completedAt: null },
    { title: 'Final logo delivery', status: 'DONE', priority: 'HIGH', project: projects[2], assignee: reviewer, dueDate: minusDays(5), completedAt: minusDays(3) },
    { title: 'Brand guideline PDF', status: 'DONE', priority: 'MEDIUM', project: projects[2], assignee: reviewer, dueDate: minusDays(3), completedAt: minusDays(2) },
    { title: 'Salesforce field mapping', status: 'BACKLOG', priority: 'MEDIUM', project: projects[3], assignee: null, dueDate: null, completedAt: null },
    { title: 'CRM sync testing', status: 'BACKLOG', priority: 'LOW', project: projects[3], assignee: null, dueDate: null, completedAt: null },
    { title: 'Product catalog import', status: 'IN_PROGRESS', priority: 'HIGH', project: projects[4], assignee: null, dueDate: plusDays(30), completedAt: null },
    { title: 'Inventory webhook setup', status: 'BACKLOG', priority: 'MEDIUM', project: projects[4], assignee: null, dueDate: plusDays(45), completedAt: null },
    { title: 'Case study interviews', status: 'BACKLOG', priority: 'LOW', project: projects[5], assignee: null, dueDate: plusDays(7), completedAt: null },
    { title: 'Image optimization', status: 'IN_REVIEW', priority: 'MEDIUM', project: projects[5], assignee: reviewer, dueDate: minusDays(2), completedAt: null },
    { title: 'Portfolio deployment', status: 'BACKLOG', priority: 'MEDIUM', project: projects[5], assignee: null, dueDate: plusDays(5), completedAt: null },
  ]
  let taskCount = 0
  for (const def of taskDefs) {
    const existing = await Task.findOne({ title: def.title, organizationId: org._id })
    if (existing) continue
    await Task.create({
      title: def.title,
      status: def.status,
      priority: def.priority,
      projectId: def.project ? def.project._id : null,
      milestoneId: null,
      assigneeId: def.assignee ? def.assignee._id : null,
      dueDate: def.dueDate,
      completedAt: def.completedAt,
      organizationId: org._id,
    })
    taskCount++
  }
  const totalTaskCount = await Task.countDocuments({ organizationId: org._id })
  console.log(`Tasks: ${totalTaskCount} demo tasks (${taskCount} new).`)

  // ─── Create fictional invoices (reconcile by number) ──────────────────────
  // Use dates relative to "today" so the dashboard 6-month revenue chart
  // and outstanding-payments queries always find matching records.
  // (Use the `now` defined earlier in the script.)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const startOf3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  // Keep the PAID invoice strictly inside the dashboard's 6-month window
  // (cutoff = now - 5 months). 4 months ago is safely inside it.
  const startOf4MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1)

  const invoiceDefs = [
    { number: `INV-${now.getFullYear()}-0001`, client: clients[0], status: 'PAID', issueDate: startOf4MonthsAgo, dueDate: new Date(startOf4MonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000), subtotal: 12000, taxRate: 10, total: 13200, paidAmount: 13200, notes: 'Website redesign - milestone 1' },
    { number: `INV-${now.getFullYear()}-0002`, client: clients[1], status: 'SENT', issueDate: startOfLastMonth, dueDate: new Date(startOfLastMonth.getTime() + 30 * 24 * 60 * 60 * 1000), subtotal: 20000, taxRate: 10, total: 22000, paidAmount: 0, notes: 'Dashboard development - monthly retainer' },
    { number: `INV-${now.getFullYear()}-0003`, client: clients[2], status: 'OVERDUE', issueDate: startOf3MonthsAgo, dueDate: startOf3MonthsAgo, subtotal: 7000, taxRate: 0, total: 7000, paidAmount: 0, notes: 'Branding package - overdue' },
    { number: `INV-${now.getFullYear()}-0004`, client: clients[4], status: 'PARTIALLY_PAID', issueDate: startOfPrevMonth, dueDate: new Date(startOfPrevMonth.getTime() + 30 * 24 * 60 * 60 * 1000), subtotal: 25000, taxRate: 8, total: 27000, paidAmount: 12000, notes: 'E-commerce build - deposit' },
    { number: `INV-${now.getFullYear()}-0005`, client: clients[6], status: 'DRAFT', issueDate: new Date(now.getFullYear(), now.getMonth(), 1), dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), subtotal: 6000, taxRate: 0, total: 6000, paidAmount: 0, notes: 'Portfolio site - initial invoice' },
    { number: `INV-${now.getFullYear()}-0006`, client: clients[3], status: 'SENT', issueDate: startOfLastMonth, dueDate: new Date(startOfLastMonth.getTime() + 60 * 24 * 60 * 60 * 1000), subtotal: 5000, taxRate: 5, total: 5250, paidAmount: 0, notes: 'CRM integration - phase 1' },
    { number: `INV-${now.getFullYear()}-0007`, client: clients[5], status: 'PAID', issueDate: new Date(now.getFullYear(), now.getMonth(), 10), dueDate: new Date(now.getFullYear(), now.getMonth(), 25), subtotal: 15000, taxRate: 10, total: 16500, paidAmount: 16500, notes: 'Logistics overhaul - milestone 2' },
  ]
  for (const def of invoiceDefs) {
    let invoice = await Invoice.findOne({ number: def.number })
    if (!invoice) {
      invoice = await Invoice.create({
        ...def,
        clientId: def.client._id,
        organizationId: org._id,
      })
    } else {
      // Reconcile dates/amounts so the dashboard 6-month revenue chart and
      // outstanding-payments queries always find matching records.
      await Invoice.updateOne(
        { _id: invoice._id },
        {
          $set: {
            issueDate: def.issueDate,
            dueDate: def.dueDate,
            status: def.status,
            subtotal: def.subtotal,
            taxRate: def.taxRate,
            total: def.total,
            paidAmount: def.paidAmount,
            clientId: def.client._id,
            notes: def.notes,
          },
        }
      )
    }

    // Reconcile line items for every invoice.
    const existingLIs = await InvoiceLineItem.find({ invoiceId: invoice._id }).lean()
    const expectedLIs = getLineItems(def.number)
    for (const exp of expectedLIs) {
      if (existingLIs.some(li => li.description === exp.description)) continue
      await InvoiceLineItem.create({ ...exp, invoiceId: invoice._id })
    }

    // Reconcile payments: ensure paid invoices have at least one payment record.
    if (def.status === 'PAID') {
      const existingPayment = await Payment.findOne({ invoiceId: invoice._id, reference: 'WIRE-001' })
      // Keep the payment date inside the current month so the dashboard's
      // "Revenue This Month" KPI picks it up.
      const paymentDate = new Date(now.getFullYear(), now.getMonth(), 15)
      if (!existingPayment) {
        await Payment.create({
          amount: def.paidAmount,
          date: paymentDate,
          method: 'BANK_TRANSFER',
          reference: 'WIRE-001',
          invoiceId: invoice._id,
          organizationId: org._id,
        })
      } else {
        await Payment.updateOne(
          { _id: existingPayment._id },
          { $set: { amount: def.paidAmount, date: paymentDate } }
        )
      }
    }
  }
  const finalInvoiceCount = await Invoice.countDocuments({ organizationId: org._id })
  console.log(`Invoices: ${finalInvoiceCount} demo invoices.`)

  // ─── Create activity records ───────────────────────────────────────────────
  const activityDefs = [
    { type: 'client_created', title: 'New client added', description: 'TechStart Inc joined the pipeline', client: clients[0], project: null },
    { type: 'project_created', title: 'Project kicked off', description: 'MediaWorks Dashboard project started', client: null, project: projects[1] },
    { type: 'task_completed', title: 'Task finished', description: 'Homepage mockup approved', client: null, project: projects[0] },
    { type: 'invoice_sent', title: 'Invoice issued', description: 'INV-2026-0002 sent to MediaWorks', client: null, project: null },
    { type: 'milestone_reached', title: 'Milestone completed', description: 'Brand guideline PDF delivered', client: null, project: projects[2] },
  ]
  for (const def of activityDefs) {
    const existing = await Activity.findOne({ title: def.title, organizationId: org._id })
    if (!existing) {
      await Activity.create({
        type: def.type,
        title: def.title,
        description: def.description,
        organizationId: org._id,
        clientId: def.client ? def.client._id : null,
        projectId: def.project ? def.project._id : null,
        createdById: reviewer._id,
      })
    }
  }
  const activityCount = await Activity.countDocuments({ organizationId: org._id })
  console.log(`Activities: ${activityCount} demo activities.`)

  // ─── Create notifications for the reviewer ─────────────────────────────────
  const notificationDefs = [
    { type: 'invoice_paid', title: 'Invoice paid', message: 'INV-2026-0001 has been paid in full', link: '/invoices', readAt: null },
    { type: 'task_due', title: 'Task due soon', message: 'Set up CI/CD pipeline is due in 14 days', link: '/tasks', readAt: null },
    { type: 'new_lead', title: 'New lead', message: 'Internal tooling audit lead added', link: '/leads', readAt: new Date() },
  ]
  for (const def of notificationDefs) {
    const existing = await Notification.findOne({ title: def.title, userId: reviewer._id })
    if (!existing) {
      await Notification.create({
        type: def.type,
        title: def.title,
        message: def.message,
        link: def.link,
        readAt: def.readAt,
        userId: reviewer._id,
        organizationId: org._id,
      })
    }
  }
  const notificationCount = await Notification.countDocuments({ userId: reviewer._id })
  console.log(`Notifications: ${notificationCount} demo notifications.`)

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

function getLineItems(invoiceNumber) {
  const lineItems = {
    'INV-2026-0001': [
      { description: 'UI/UX Design', quantity: 1, unitPrice: 8000, amount: 8000 },
      { description: 'Frontend Development', quantity: 40, unitPrice: 100, amount: 4000 },
    ],
    'INV-2026-0002': [
      { description: 'Dashboard Development', quantity: 80, unitPrice: 250, amount: 20000 },
      { description: 'Chart Components', quantity: 20, unitPrice: 100, amount: 2000 },
    ],
    'INV-2026-0003': [
      { description: 'Logo Design', quantity: 1, unitPrice: 3000, amount: 3000 },
      { description: 'Brand Guidelines', quantity: 1, unitPrice: 4000, amount: 4000 },
    ],
    'INV-2026-0004': [
      { description: 'E-commerce Platform', quantity: 1, unitPrice: 25000, amount: 25000 },
    ],
    'INV-2026-0005': [
      { description: 'Portfolio Website', quantity: 1, unitPrice: 6000, amount: 6000 },
    ],
    'INV-2026-0006': [
      { description: 'CRM Integration Phase 1', quantity: 1, unitPrice: 5000, amount: 5000 },
    ],
  }
  return lineItems[invoiceNumber] || []
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
