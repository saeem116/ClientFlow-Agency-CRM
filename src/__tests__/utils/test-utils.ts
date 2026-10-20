import mongoose from 'mongoose'
import { ensureDb, User, Organization, Membership, Client, Lead, Project, Milestone, Task, Invoice, InvoiceLineItem, Payment, Activity, Notification } from '@/lib/database'
import { connectPromise } from './setup'

let counter = 0

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${counter++}`
}

export async function setupTestData() {
  console.log('[test-utils] setupTestData called, readyState:', mongoose.connection.readyState)

  // Wait for the module-level connection to complete
  console.log('[test-utils] awaiting connectPromise...')
  try {
    await connectPromise
    console.log('[test-utils] connectPromise resolved, readyState:', mongoose.connection.readyState)
  } catch (err) {
    console.log('[test-utils] connectPromise rejected:', err)
    return null
  }

  if (mongoose.connection.readyState !== 1) {
    console.log('[test-utils] NOT CONNECTED, readyState:', mongoose.connection.readyState)
    return null
  }

  console.log('[test-utils] CONNECTED, creating test data...')
  const org = await Organization.create({ name: 'Test Org', slug: uniqueSlug('test') })
  const user = await User.create({ email: 'test-user@example.com', name: 'Test User', role: 'ADMIN' })
  await Membership.create({ userId: user._id, organizationId: org._id, role: 'ADMIN' })
  const client = await Client.create({
    firstName: 'Test', lastName: 'Client', email: 'test-client@example.com',
    organizationId: org._id, createdById: user._id,
  })
  console.log('[test-utils] setupTestData DONE')
  return { orgId: org._id.toString(), userId: user._id.toString(), clientId: client._id.toString() }
}

export async function cleanupTestData() {
  if (mongoose.connection.readyState !== 1) return
  const collections = mongoose.connection.collections
  const names = Object.keys(collections)
  for (const name of names) {
    try {
      // Only delete documents from the example.com test domain.
      // This guarantees zero risk to real production data, even if a
      // misconfigured test somehow connects to the wrong database.
      await mongoose.connection.collections[name].deleteMany({
        email: { $regex: /@example\.com$/i },
      })
    } catch {
      // Collection may not exist or may not support the query — skip silently.
    }
  }
}

export { ensureDb, User, Organization, Membership, Client, Lead, Project, Milestone, Task, Invoice, InvoiceLineItem, Payment, Activity, Notification }
// Re-export as MongoFileModel to avoid colliding with the global browser `File` class
import { File as MongoFile } from '@/lib/database'
export const MongoFileModel = MongoFile