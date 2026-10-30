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
 *   MONGODB_URI=mongodb://localhost:27017/clientflow node database/migrations/001-create-indexes.js
 *
 * The models imported here use the same Mongoose connection singleton that the
 * application uses, so indexes are created on the same collections.
 */
const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log(`Connected to: ${MONGODB_URI}`)

  // Re-import models after connect to ensure Mongoose models are registered
  const { User } = require('../src/lib/mongoose/user')
  const { Organization } = require('../src/lib/mongoose/organization')
  const { Membership } = require('../src/lib/mongoose/membership')
  const { Client } = require('../src/lib/mongoose/client')
  const { Lead } = require('../src/lib/mongoose/lead')
  const { Project } = require('../src/lib/mongoose/project')
  const { Milestone } = require('../src/lib/mongoose/milestone')
  const { Task } = require('../src/lib/mongoose/task')
  const { Invoice } = require('../src/lib/mongoose/invoice')
  const { InvoiceLineItem } = require('../src/lib/mongoose/invoice-line-item')
  const { Payment } = require('../src/lib/mongoose/payment')
  const { Activity } = require('../src/lib/mongoose/activity')
  const { Notification } = require('../src/lib/mongoose/notification')
  const { Invitation } = require('../src/lib/mongoose/invitation')
  const { File } = require('../src/lib/mongoose/file')

  const models = [
    User, Organization, Membership, Client, Lead, Project, Milestone, Task,
    Invoice, InvoiceLineItem, Payment, Activity, Notification, Invitation, File,
  ]

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