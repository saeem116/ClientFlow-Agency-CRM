import { connectMongo } from "./mongodb"
import {
  User,
  Organization,
  Membership,
  Client,
  Lead,
  Project,
  Milestone,
  Task,
  Invoice,
  InvoiceLineItem,
  Payment,
  Activity,
  Notification,
  Invitation,
  File,
} from "./mongoose"

let connected = false

export async function ensureDb() {
  if (connected) return
  try {
    await connectMongo()
    connected = true
  } catch (error) {
    // MongoDB may not be available during build time - log and continue
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('Warning: MongoDB connection failed during build. Pages will render without data.')
      return
    }
    throw error
  }
}

export { User, Organization, Membership, Client, Lead, Project, Milestone, Task, Invoice, InvoiceLineItem, Payment, Activity, Notification, Invitation, File }

// Helper to convert Mongoose document to plain object with string IDs
export function toPlain<T>(doc: T | null | undefined): T | null {
  if (!doc) return null
  if (Array.isArray(doc)) return doc.map(toPlain) as unknown as T
  const mongooseDoc = doc as Record<string, unknown>
  if ('toObject' in mongooseDoc && typeof mongooseDoc.toObject === 'function') {
    return (mongooseDoc.toObject() as unknown as T) ?? null
  }
  return doc as T
}