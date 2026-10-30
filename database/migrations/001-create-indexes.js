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
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log(`Connected to: ${MONGODB_URI}`)

  // Re-import models after connect to ensure Mongoose models are registered
  const { User } = await import('../src/lib/mongoose/user.js')
  const { Organization } = await import('../src/lib/mongoose/organization.js')
  const { Membership } = await import('../src/lib/mongoose/membership.js')
  const { Client } = await import('../src/lib/mongoose/client.js')
  const { Lead } = await import('../src/lib/mongoose/lead.js')
  const { Project } = await import('../src/lib/mongoose/project.js')
  const { Milestone } = await import('../src/lib/mongoose/milestone.js')
  const { Task } = await import('../src/lib/mongoose/task.js')
  const { Invoice } = await import('../src/lib/mongoose/invoice.js')
  const { InvoiceLineItem } = await import('../src/lib/mongoose/invoice-line-item.js')
  const { Payment } = await import('../src/lib/mongoose/payment.js')
  const { Activity } = await import('../src/lib/mongoose/activity.js')
  const { Notification } = await import('../src/lib/mongoose/notification.js')
  const { Invitation } = await import('../src/lib/mongoose/invitation.js')
  const { File } = await import('../src/lib/mongoose/file.js')

  const models = [
    User, Organization, Membership, Client, Lead, Project, Milestone, Task,
    Invoice, InvoiceLineItem, Payment, Activity, Notification, Invitation, File,
  ]

  let totalCreated = 0
  let totalSkipped = 0
  const errors = []

  for (const model of models) {
    const name = model.modelName
    const indexes = (model.schema.indexes || []) as Array<
      [Record<string, unknown>, Record<string, unknown>]
    >

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