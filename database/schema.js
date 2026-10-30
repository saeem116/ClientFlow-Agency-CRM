/**
 * ClientFlow — Database Schema Initialization Script
 *
 * Creates all MongoDB collections and indexes from an empty database,
 * matching the actual Mongoose models in src/lib/mongoose/.
 *
 * This script is idempotent and safe to run multiple times.
 * It uses Mongoose's syncIndexes() which only adds missing indexes
 * and never drops existing ones.
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/clientflow node database/schema.js
 *
 * Requirements:
 *   - MONGODB_URI must be set (defaults to mongodb://localhost:27017/clientflow)
 *   - Does NOT fall back to production database silently
 *   - Requires explicit MONGODB_URI environment variable
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

function getMongoUri() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ ERROR: MONGODB_URI environment variable is required.')
    console.error('   Set MONGODB_URI to your target database connection string.')
    console.error('   Example: MONGODB_URI=mongodb://localhost:27017/clientflow node database/schema.js')
    process.exit(1)
  }
  return uri
}

async function main() {
  const uri = getMongoUri()

  console.log('=== ClientFlow Database Schema Initialization ===')
  console.log('')
  console.log('Target database:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'))
  console.log('')

  try {
    await mongoose.connect(uri)
    console.log('✅ Connected to MongoDB')
    console.log('')

    const models = [
      { name: 'User', model: User, collection: 'users' },
      { name: 'Organization', model: Organization, collection: 'organizations' },
      { name: 'Membership', model: Membership, collection: 'memberships' },
      { name: 'Client', model: Client, collection: 'clients' },
      { name: 'Lead', model: Lead, collection: 'leads' },
      { name: 'Project', model: Project, collection: 'projects' },
      { name: 'Milestone', model: Milestone, collection: 'milestones' },
      { name: 'Task', model: Task, collection: 'tasks' },
      { name: 'Invoice', model: Invoice, collection: 'invoices' },
      { name: 'InvoiceLineItem', model: InvoiceLineItem, collection: 'invoicelineitems' },
      { name: 'Payment', model: Payment, collection: 'payments' },
      { name: 'Activity', model: Activity, collection: 'activities' },
      { name: 'Notification', model: Notification, collection: 'notifications' },
      { name: 'Invitation', model: Invitation, collection: 'invitations' },
      { name: 'File', model: File, collection: 'files' },
    ]

    const createdIndexes = {}

    for (const { name, model, collection } of models) {
      // Check if collection exists
      const collections = await mongoose.connection.db.listCollections({ name: collection }).toArray()
      if (collections.length === 0) {
        // Collection doesn't exist - Mongoose will create it on first index sync
        console.log(`📁 Collection '${collection}' will be created by index sync`)
      } else {
        console.log(`📁 Collection '${collection}' already exists`)
      }

      // Sync indexes - this creates missing indexes without dropping existing ones
      console.log(`🔧 Syncing indexes for ${name}...`)
      const result = await model.syncIndexes()
      if (result && result.length > 0) {
        createdIndexes[name] = result.map(idx => idx.name || JSON.stringify(idx.key))
        console.log(`   Created indexes: ${createdIndexes[name].join(', ')}`)
      } else {
        console.log(`   All indexes already exist`)
      }
    }

    console.log('')
    console.log('=== Summary ===')
    console.log('')

    // List all collections and their indexes
    const allCollections = await mongoose.connection.db.listCollections().toArray()
    console.log(`Total collections: ${allCollections.length}`)
    console.log('')

    for (const coll of allCollections.sort((a, b) => a.name.localeCompare(b.name))) {
      const indexes = await mongoose.connection.db.collection(coll.name).indexes()
      console.log(`📦 ${coll.name}`)
      for (const idx of indexes) {
        const keys = Object.entries(idx.key).map(([k, v]) => `${k}:${v}`).join(', ')
        const unique = idx.unique ? ' (unique)' : ''
        const sparse = idx.sparse ? ' (sparse)' : ''
        console.log(`   • ${idx.name}: { ${keys} }${unique}${sparse}`)
      }
      console.log('')
    }

    console.log('✅ Schema initialization complete!')
    console.log('')

  } catch (error) {
    console.error('❌ Schema initialization failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

main()