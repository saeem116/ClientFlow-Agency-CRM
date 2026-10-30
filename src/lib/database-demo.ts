/**
 * Demo database models — lazy, connection-scoped model getters.
 *
 * Each exported function connects to the demo database on first call and
 * returns a Mongoose model bound to that connection. Models are cached
 * per-name so subsequent calls are free.
 *
 * Production code NEVER imports these directly — they're only used when a
 * demo session is detected in getSession() / signIn() / getOrganization().
 * The schemas are defined inline here so they live only in this module's
 * scope and never touch the production model cache.
 */
import mongoose from "mongoose"
import { connectDemoDb } from "./demo-mongoose"

// ─── Inline schemas (copied from production to avoid circular deps) ──────────

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
  notes: { type: String, default: null },
  subtotal: { type: Number, default: 0, required: true },
  taxRate: { type: Number, default: 0, required: true },
  taxAmount: { type: Number, default: 0, required: true },
  total: { type: Number, default: 0, required: true },
  paidAmount: { type: Number, default: 0, required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
}, { timestamps: true })

const invoiceLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
}, { timestamps: true })

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  method: { type: String, default: null },
  reference: { type: String, default: null },
  notes: { type: String, default: null },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
}, { timestamps: true })

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  dueDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
}, { timestamps: true })

const activitySchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null, index: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true })

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  type: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, default: null },
  readAt: { type: Date, default: null, index: true },
  link: { type: String, default: null, trim: true },
}, { timestamps: true })

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  role: { type: String, enum: ["ADMIN", "MEMBER", "CLIENT"], required: true, default: "MEMBER" },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  invitedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true },
  tokenPrefix: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"], default: "PENDING", index: true },
}, { timestamps: true })

// ─── Lazy model getters ───────────────────────────────────────────────────────
// Each getter connects to the demo DB on first call, then caches the model.

const schemaMap: Record<string, mongoose.Schema> = {
  User: userSchema,
  Organization: organizationSchema,
  Membership: membershipSchema,
  Client: clientSchema,
  Lead: leadSchema,
  Project: projectSchema,
  Task: taskSchema,
  Milestone: milestoneSchema,
  Invoice: invoiceSchema,
  InvoiceLineItem: invoiceLineItemSchema,
  Payment: paymentSchema,
  Activity: activitySchema,
  Notification: notificationSchema,
  Invitation: invitationSchema,
}

const modelCache = new Map<string, mongoose.Model<mongoose.Document>>()

async function getModel(name: string): Promise<mongoose.Model<mongoose.Document>> {
  const cached = modelCache.get(name)
  if (cached) return cached

  const m = await connectDemoDb()
  if (!m) throw new Error(`Demo connection not available for model: ${name}`)

  // Clear any previously cached model with this name on the demo connection.
  delete (m as unknown as Record<string, unknown>).models[name]

  const model = m.model(name, schemaMap[name])
  modelCache.set(name, model)
  return model
}

export const User = () => getModel("User")
export const Organization = () => getModel("Organization")
export const Membership = () => getModel("Membership")
export const Client = () => getModel("Client")
export const Lead = () => getModel("Lead")
export const Project = () => getModel("Project")
export const Task = () => getModel("Task")
export const Milestone = () => getModel("Milestone")
export const Invoice = () => getModel("Invoice")
export const InvoiceLineItem = () => getModel("InvoiceLineItem")
export const Payment = () => getModel("Payment")
export const Activity = () => getModel("Activity")
export const Notification = () => getModel("Notification")
export const Invitation = () => getModel("Invitation")
// File is GridFS-based and not needed for demo reads; production gets it from the main DB.
