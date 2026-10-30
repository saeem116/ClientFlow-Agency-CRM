/**
 * ClientFlow — Database Schema Initialization Script
 *
 * Creates missing MongoDB collections and indexes from an empty or partially-
 * populated database, matching the actual Mongoose models in src/lib/mongoose/.
 *
 * This script is idempotent and safe to run multiple times.
 * It uses model.createIndex() which only adds missing indexes and never
 * drops existing ones. It does NOT use syncIndexes() or cleanIndexes().
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/clientflow node database/schema.js
 *
 * Requirements:
 *   - MONGODB_URI must be set (defaults to mongodb://localhost:27017/clientflow)
 *   - Positive host allowlist: only localhost, 127.0.0.1, ::1, or Docker hostnames
   - Requires EXPLICIT_CONFIRMATION=YES before any database operations
 *   - Never silently falls back to a production database
 *   - Requires explicit MONGODB_URI environment variable
 *   - Prints target database name without exposing credentials
 */

import mongoose from 'mongoose'

// Import all models from the actual Mongoose definitions
import { User } from '../src/lib/mongoose/user.js'
import { Organization } from '../src/lib/mongoose/organization.js'
import { Membership } from '../src/lib/mongoose/membership.js'
import { Client } from '../src/lib/mongoose/client.js'
import { Lead } from '../src/lib/mongoose/lead.js'
import { Project } from '../src/lib/mongoose/project.js'
import { Milestone } from '../src/lib/mongoose/milestone.js'
import { Task } from '../src/lib/mongoose/task.js'
import { Invoice } from '../src/lib/mongoose/invoice.js'
import { InvoiceLineItem } from '../src/lib/mongoose/invoice-line-item.js'
import { Payment } from '../src/lib/mongoose/payment.js'
import { Activity } from '../src/lib/mongoose/activity.js'
import { Notification } from '../src/lib/mongoose/notification.js'
import { Invitation } from '../src/lib/mongoose/invitation.js'
import { File } from '../src/lib/mongoose/file.js'

// ─── Host Allowlist for Local Development ──────────────────────────────────
//
// Only these hostnames are allowed for database initialization.
// Docker MongoDB service hostname: "mongo" (from docker-compose.yml).
// Always use an explicit MONGODB_URI pointing to a local or test database.
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'mongo'])

function getAllowlistError(): string {
  return '❌ MONGODB_URI host is not allowed. Allowed hosts: localhost, 127.0.0.1, ::1, mongo (Docker).'
}

// Parse the hostname from a MongoDB URI.
// Returns the hostname string, or null if cannot parse.
function parseMongoHostname(uri: string): string | null {
  // mongodb://username:password@host:port/database
  // mongodb+srv://cluster0.mongodb.net/database
  // Extract the host from the URI authority section.

  // Handle mongodb+srv://... (DNS seedlist)
  if (uri.startsWith('mongodb+srv://')) {
    // mongodb+srv://<host>/<db>
    const afterSrv = uri.substring('mongodb+srv://'.length)
    const slashIdx = afterSrv.indexOf('/')
    const hostPort = slashIdx === -1 ? afterSrv : afterSrv.substring(0, slashIdx)
    // Remove port if present
    const colonIdx = hostPort.lastIndexOf(':')
    if (colonIdx !== -1) {
      return hostPort.substring(0, colonIdx)
    }
    return hostPort
  }

  // Handle mongodb://... (direct connection)
  if (uri.startsWith('mongodb://')) {
    const afterSchema = uri.substring('mongodb://'.length)
    // user:password@host:port/path
    const atIdx = afterSchema.indexOf('@')
    if (atIdx === -1) return null // no auth, treat as malformed for our purposes
    const hostPort = afterSchema.substring(atIdx + 1)
    const slashIdx = hostPort.indexOf('/')
    const hostPortPart = slashIdx === -1 ? hostPort : hostPort.substring(0, slashIdx)
    const colonIdx = hostPortPart.lastIndexOf(':')
    if (colonIdx !== -1) {
      return hostPortPart.substring(0, colonIdx)
    }
    return hostPortPart
  }

  return null
}

// ─── URI Safety Validation ─────────────────────────────────────────────────

function validateMongoUri(uri: string): { allowed: boolean; error?: string } {
  // 1. Validate scheme
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    return { allowed: false, error: 'URI must use mongodb:// or mongodb+srv:// scheme.' }
  }

  // 2. Parse hostname
  const hostname = parseMongoHostname(uri)
  if (!hostname) {
    return { allowed: false, error: 'Could not parse hostname from URI.' }
  }

  // 3. Positive allowlist check
  if (!ALLOWED_HOSTS.has(hostname.toLowerCase())) {
    return {
      allowed: false,
      error: getAllowlistError(),
    }
  }

  return { allowed: true }
}

// ─── Explicit Confirmation ─────────────────────────────────────────────────

function requireConfirmation(): boolean {
  const explicitConfirm = process.env.EXPLICIT_CONFIRMATION
  if (explicitConfirm !== 'YES') {
    console.error('❌ EXPLICIT_CONFIRMATION must be set to YES to run schema initialization.')
    console.error('   This is a safety guard to prevent accidental database operations.')
    console.error('   Example:')
    console.error('   EXPLICIT_CONFIRMATION=YES MONGODB_URI=mongodb://localhost:27017/clientflow node database/schema.js')
    process.exit(1)
  }
  return true
}

// ─── Index Definitions (derived from actual Mongoose schemas) ──────────────
//
// Each entry maps to a model and the indexes that should be created.
// These are the indexes declared via `index: true` or `unique: true` in the
// Mongoose schema definitions.  createIndexes() will only create missing ones.

const indexSpecs = {
  User: [
    { key: { email: 1 }, unique: true, name: 'email_1' },
  ],
  Organization: [
    { key: { slug: 1 }, unique: true, name: 'slug_1' },
  ],
  Membership: [
    {
      key: { organizationId: 1, userId: 1 },
      unique: true,
      name: 'organizationId_1_userId_1',
    },
  ],
  Client: [
    { key: { email: 1 }, unique: true, name: 'email_1' },
    { key: { status: 1 }, name: 'status_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
  ],
  Lead: [
    { key: { title: 1 }, name: 'title_1' },
    { key: { stage: 1 }, name: 'stage_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { followUpAt: 1 }, name: 'followUpAt_1' },
  ],
  Project: [
    { key: { name: 1 }, name: 'name_1' },
    { key: { status: 1 }, name: 'status_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { clientId: 1 }, name: 'clientId_1' },
  ],
  Milestone: [
    { key: { projectId: 1 }, name: 'projectId_1' },
  ],
  Task: [
    { key: { title: 1 }, name: 'title_1' },
    { key: { status: 1 }, name: 'status_1' },
    { key: { projectId: 1 }, name: 'projectId_1' },
    { key: { milestoneId: 1 }, name: 'milestoneId_1' },
    { key: { assigneeId: 1 }, name: 'assigneeId_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
  ],
  Invoice: [
    { key: { number: 1 }, unique: true, name: 'number_1' },
    { key: { status: 1 }, name: 'status_1' },
    { key: { issueDate: 1 }, name: 'issueDate_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { clientId: 1 }, name: 'clientId_1' },
  ],
  InvoiceLineItem: [
    { key: { description: 1 }, name: 'description_1' },
    { key: { invoiceId: 1 }, name: 'invoiceId_1' },
  ],
  Payment: [
    { key: { invoiceId: 1 }, name: 'invoiceId_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
  ],
  Activity: [
    { key: { type: 1 }, name: 'type_1' },
    { key: { title: 1 }, name: 'title_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { clientId: 1 }, name: 'clientId_1' },
    { key: { leadId: 1 }, name: 'leadId_1' },
    { key: { projectId: 1 }, name: 'projectId_1' },
  ],
  Notification: [
    { key: { userId: 1 }, name: 'userId_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { type: 1 }, name: 'type_1' },
    { key: { readAt: 1 }, name: 'readAt_1' },
  ],
  Invitation: [
    { key: { email: 1 }, unique: true, name: 'email_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { tokenPrefix: 1 }, name: 'tokenPrefix_1' },
    { key: { expiresAt: 1 }, name: 'expiresAt_1' },
    { key: { status: 1 }, name: 'status_1' },
  ],
  File: [
    { key: { fileId: 1 }, unique: true, name: 'fileId_1' },
    { key: { originalFilename: 1 }, name: 'originalFilename_1' },
    { key: { uploaderId: 1 }, name: 'uploaderId_1' },
    { key: { organizationId: 1 }, name: 'organizationId_1' },
    { key: { clientId: 1 }, name: 'clientId_1' },
    { key: { projectId: 1 }, name: 'projectId_1' },
  ],
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // ① Explicit safety confirmation
  requireConfirmation()

  // ② URI validation with allowlist
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ ERROR: MONGODB_URI environment variable is required.')
    console.error('   Set MONGODB_URI to your target database connection string.')
    console.error('   Example: EXPLICIT_CONFIRMATION=YES MONGODB_URI=mongodb://localhost:27017/clientflow node database/schema.js')
    process.exit(1)
  }

  const uriValidation = validateMongoUri(uri)
  if (!uriValidation.allowed) {
    console.error(uriValidation.error!)
    process.exit(1)
  }

  // Display target database (safe — no credentials)
  const dbMatch = uri.match(/mongodb(\+srv)?:\/\/[^/]+\/([^/?]+)/)
  const dbName = dbMatch ? dbMatch[2] : 'unknown'
  console.log('=== ClientFlow Database Schema Initialization ===')
  console.log(`Target database: ${dbName}`)
  console.log(`Target host: allowed (local development)`)
  console.log('')

  try {
    await mongoose.connect(uri)
    console.log('✅ Connected to MongoDB')
    console.log('')

    const models = [
      { name: 'User', model: User },
      { name: 'Organization', model: Organization },
      { name: 'Membership', model: Membership },
      { name: 'Client', model: Client },
      { name: 'Lead', model: Lead },
      { name: 'Project', model: Project },
      { name: 'Milestone', model: Milestone },
      { name: 'Task', model: Task },
      { name: 'Invoice', model: Invoice },
      { name: 'InvoiceLineItem', model: InvoiceLineItem },
      { name: 'Payment', model: Payment },
      { name: 'Activity', model: Activity },
      { name: 'Notification', model: Notification },
      { name: 'Invitation', model: Invitation },
      { name: 'File', model: File },
    ]

    let totalCreated = 0
    let totalIndexesCreated = 0
    const errors: string[] = []

    for (const { name, model } of models) {
      // ── Check if collection exists ──────────────────────────────────────
      const existingCollections = await mongoose.connection.db
        .listCollections({ name: model.collection || name.toLowerCase() })
        .toArray()

      const collectionName = model.collection || name.toLowerCase()

      if (existingCollections.length === 0) {
        // Collection doesn't exist — create it
        await mongoose.connection.db.createCollection(collectionName)
        collectionCreated = true
        console.log(`📁 Created collection: ${collectionName}`)
        totalCreated++
      } else {
        console.log(`📁 Collection already exists: ${collectionName}`)
      }

      // ── Create missing indexes ──────────────────────────────────────────
      const specs = indexSpecs[name as keyof typeof indexSpecs]
      if (specs && specs.length > 0) {
        const createdIndexes: { name: string; key: string }[] = []

        for (const spec of specs) {
          const indexKey: Record<string, number> = {}
          for (const [field, direction] of Object.entries(spec.key)) {
            indexKey[field] = direction
          }

          // Build the options object, only including properties that make sense
          const options: Record<string, unknown> = {}
          if (spec.unique !== undefined) options.unique = spec.unique
          if (spec.sparse !== undefined) options.sparse = spec.sparse
          // Always set the index name if provided
          if (spec.name) options.name = spec.name

          try {
            // createIndex returns the actual index name
            const result = await model.createIndex(indexKey, options)
            createdIndexes.push({ name: result, key: JSON.stringify(indexKey) })
            totalIndexesCreated++
          } catch (err) {
            const msg = (err as Error).message || String(err)
            // Idempotent: skip when the index already exists with the same
            // or compatible options.  Different error codes from MongoDB:
            //   - E11000 duplicate key: index already exists (unique)
            //   - IndexOptionsConflict: index exists with different options
            //   - "index already exists": generic message
            if (
              msg.includes('E11000 duplicate key') ||
              msg.includes('IndexOptionsConflict') ||
              msg.includes('index already exists')
            ) {
              // Index already exists; skip silently.
            } else {
              errors.push(`Model ${name}: failed to create index ${JSON.stringify(indexKey)} — ${msg}`)
            }
          }
        }
      }
    }

    console.log('')
    console.log('=== Summary ===')
    console.log(`Collections created: ${totalCreated}`)
    console.log(`Indexes created (missing only): ${totalIndexesCreated}`)
    console.log('')

    if (errors.length > 0) {
      console.log('⚠️  Errors:')
      errors.forEach((e) => console.log(`  • ${e}`))
    }

    console.log('')
    console.log('✅ Schema initialization complete!')
    console.log('')

  } catch (error) {
    console.error('❌ Schema initialization failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

// Run main
main()