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
  // Vercel serverless functions are frequently cold-started. The first
  // request after an idle period may hit MongoDB before the connection
  // pool is ready, and the default 3s serverSelectionTimeoutMS is too short
  // to recover. Retry a few times with backoff before giving up so that a
  // cold-started dashboard (which renders the shell + sidebar) can still
  // succeed on the first paint instead of throwing a 500.
  const maxRetries = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectMongo()
      connected = true
      return
    } catch (error) {
      lastError = error
      // Log the actual error for debugging (without exposing secrets)
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : String(error))
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('Warning: MongoDB connection failed during build. Pages will render without data.')
        return
      }
      if (attempt < maxRetries) {
        // Backoff before retrying: 200ms, 600ms, 1200ms
        await new Promise(r => setTimeout(r, attempt * 200 + 200))
      }
    }
  }
  throw new Error(`Database connection failed after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
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