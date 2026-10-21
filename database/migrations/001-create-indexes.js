/**
 * Migration 001: Ensure all required Mongoose indexes exist.
 *
 * This is a non-destructive idempotent migration. It may be run against a
 * fresh database or an existing one — extra indexes are silently ignored by
 * MongoDB, and existing data is never modified.
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

  console.log('Syncing indexes (non-destructive)...')
  await User.syncIndexes()
  await Organization.syncIndexes()
  await Membership.syncIndexes()
  await Client.syncIndexes()
  await Lead.syncIndexes()
  await Project.syncIndexes()
  await Milestone.syncIndexes()
  await Task.syncIndexes()
  await Invoice.syncIndexes()
  await InvoiceLineItem.syncIndexes()
  await Payment.syncIndexes()
  await Activity.syncIndexes()
  await Notification.syncIndexes()
  await Invitation.syncIndexes()
  await File.syncIndexes()

  console.log('All indexes synced successfully.')
  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})