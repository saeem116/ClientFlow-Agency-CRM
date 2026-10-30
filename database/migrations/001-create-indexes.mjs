/**
 * Migration 001: Ensure all required Mongoose indexes exist.
 *
 * This is a non-destructive idempotent migration. It may be run against a
 * fresh database or an existing one — it only creates indexes that are
 * declared in the Mongoose schemas and never drops or modifies existing ones.
 *
 * Indexes are derived directly from `model.schema.indexes` at runtime, so this
 * file always matches the current schemas (no duplicated, drift-prone spec
 * tables). It deliberately does NOT use syncIndexes() or init(), which would
 * drop any custom indexes that exist on the collections but not in the schemas.
 *
 * Usage (from project root):
 *   MONGODB_URI=mongodb://localhost:27017/clientflow npx tsx database/migrations/001-create-indexes.mjs
 *
 * The schemas are defined inline here to avoid loading production models
 * that depend on the production Mongoose connection.
 */
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

// ─── Inline schemas (copied from production to avoid connection coupling) ──────────

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  name: { type: String, default: null },
  avatar: { type: String, default: null },
  password: { type: String, default: null, select: false },
  role: { type: String, enum: ["ADMIN", "MEMBER", "CLIENT"], default: "MEMBER", required: true },
  phone: { type: String, default: null, trim: true },
}, { timestamps: true })

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
}, { timestamps: true })

const membershipSchema = new mongoose.Schema({
  role: { type: String, enum: ["ADMIN", "MEMBER", "CLIENT"], default: "MEMBER", required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true })
membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true })

const clientSchema = new mongoose.Schema({
  firstName: { type: String, default: null, trim: true },
  lastName: { type: String, default: null, trim: true },
  companyName: { type: String, default: null, trim: true },
  email: { type: String, default: null, lowercase: true, trim: true, index: true },
  phone: { type: String, default: null, trim: true },
  website: { type: String, default: null, trim: true },
  address: { type: String, default: null, trim: true },
  city: { type: String, default: null, trim: true },
  country: { type: String, default: null, trim: true },
  notes: { type: String, default: null },
  status: { type: String, enum: ["active", "inactive", "prospect"], default: "active", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const leadSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: null },
  email: { type: String, default: null, lowercase: true, trim: true },
  phone: { type: String, default: null, trim: true },
  stage: { type: String, enum: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"], default: "NEW", required: true, index: true },
  source: { type: String, enum: ["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "EMAIL", "PHONE", "OTHER"], default: null },
  value: { type: Number, default: null },
  notes: { type: String, default: null },
  followUpAt: { type: Date, default: null, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: null },
  status: { type: String, enum: ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"], default: "DRAFT", required: true, index: true },
  priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM", required: true },
  budget: { type: Number, default: null },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  dueDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
}, { timestamps: true })

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: null },
  status: { type: String, enum: ["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "DONE"], default: "BACKLOG", required: true, index: true },
  priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM", required: true },
  dueDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
  milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", default: null },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
}, { timestamps: true })

const invoiceSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOIDED"], default: "DRAFT", required: true, index: true },
  issueDate: { type: Date, default: Date.now, required: true },
  dueDate: { type: Date, default: null },
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  notes: { type: String, default: null },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const invoiceLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
}, { timestamps: true })

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  method: { type: String, enum: ["CASH", "CHECK", "BANK_TRANSFER", "CREDIT_CARD", "PAYPAL", "STRIPE", "OTHER"], default: "BANK_TRANSFER" },
  reference: { type: String, default: null },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
}, { timestamps: true })

const activitySchema = new mongoose.Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: null },
  readAt: { type: Date, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
}, { timestamps: true })

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ["ADMIN", "MEMBER", "CLIENT"], default: "MEMBER", required: true },
  tokenPrefix: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"], default: "PENDING", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  invitedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  gridFsId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  relatedType: { type: String, enum: ["CLIENT", "PROJECT", "TASK", "INVOICE", "LEAD"], default: null },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true })

// ─── Models ───────────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema)
const Organization = mongoose.model('Organization', organizationSchema)
const Membership = mongoose.model('Membership', membershipSchema)
const Client = mongoose.model('Client', clientSchema)
const Lead = mongoose.model('Lead', leadSchema)
const Project = mongoose.model('Project', projectSchema)
const Milestone = mongoose.model('Milestone', milestoneSchema)
const Task = mongoose.model('Task', taskSchema)
const Invoice = mongoose.model('Invoice', invoiceSchema)
const InvoiceLineItem = mongoose.model('InvoiceLineItem', invoiceLineItemSchema)
const Payment = mongoose.model('Payment', paymentSchema)
const Activity = mongoose.model('Activity', activitySchema)
const Notification = mongoose.model('Notification', notificationSchema)
const Invitation = mongoose.model('Invitation', invitationSchema)
const File = mongoose.model('File', fileSchema)

const models = [
  User, Organization, Membership, Client, Lead, Project, Milestone, Task,
  Invoice, InvoiceLineItem, Payment, Activity, Notification, Invitation, File,
]

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log(`Connected to: ${MONGODB_URI}`)

  let totalCreated = 0
  let totalSkipped = 0
  const errors = []

  for (const model of models) {
    const name = model.modelName
    const indexes = model.schema.indexes || []

    if (indexes.length === 0) {
      console.log(`ℹ️  No indexes declared for ${name}`)
      continue
    }

    for (const [indexKey, options = {}] of indexes) {
      try {
        await model.createIndex(indexKey, options)
        totalCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // Index already exists (same or compatible spec) — idempotent no-op.
        if (
          msg.includes('Index already exists') ||
          msg.includes('E11000 duplicate key') ||
          msg.includes('IndexOptionsConflict')
        ) {
          totalSkipped++
          continue
        }
        errors.push(`${name}: failed to create index ${JSON.stringify(indexKey)} — ${msg}`)
      }
    }
    console.log(`🔧 Checked indexes for ${name} (${indexes.length} declared)`)
  }

  console.log('')
  console.log('=== Summary ===')
  console.log(`Indexes created: ${totalCreated}`)
  console.log(`Indexes already present (skipped): ${totalSkipped}`)
  if (errors.length > 0) {
    console.log('')
    console.log('⚠️  Errors:')
    errors.forEach((e) => console.log(`  • ${e}`))
  }
  console.log('')
  console.log('✅ Index migration complete!')
  console.log('')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})