/**
 * Reset and seed the MongoDB database with initial data.
 * Run with: node scripts/reset-db.js --force
 *
 * SAFETY: This script drops the entire database. It requires the --force flag
 * and only allows local hosts (localhost, 127.0.0.1, ::1). Always run against
 * a local or dedicated test DB.
 *
 * URI validation is handled by the shared validator in src/lib/seed/shared.ts.
 */
import mongoose from 'mongoose'
import { randomBytes } from 'crypto'
import {
  hashPassword,
  validateSeedUri,
  findOrCreateUser,
  findOrCreateOrganization,
} from '../src/lib/seed/shared.ts'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

// ─── URI Validation ────────────────────────────────────────────────────────────
const validation = validateSeedUri(MONGODB_URI)
if (!validation.ok) {
  console.error(`❌ ERROR: ${validation.error}`)
  console.error('   This script refuses to reset a remote/production database.')
  process.exit(1)
}

// Safety guard: refuse to run without an explicit --force flag.
const forceFlag = process.argv.includes('--force')
if (!forceFlag) {
  console.error('❌ REFUSING TO RESET DATABASE.')
  console.error('')
  console.error('This script drops the entire database and reseeds it.')
  console.error('It will DELETE ALL EXISTING DATA.')
  console.error('')
  console.error('To proceed, run with --force:')
  console.error('  npm run db:reset -- --force')
  console.error('')
  process.exit(1)
}

// Final confirmation before proceeding
const dbName = validation.ok ? 'clientflow' : '(unknown)'
console.log(`⚠️  About to DROP database: ${dbName}`)
console.log(`   URI host: ${validation.ok ? 'localhost (allowed)' : '(unknown)'}`)
console.log('')

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  // Clear existing data
  console.log('Clearing existing data...')
  await mongoose.connection.dropDatabase()
  console.log('Database cleared.')

  // Import models after connection for dynamic resolution
  const { User } = await import('../src/lib/mongoose/user.ts')
  const { Organization } = await import('../src/lib/mongoose/organization.ts')
  const { Membership } = await import('../src/lib/mongoose/membership.ts')
  const { Client } = await import('../src/lib/mongoose/client.ts')
  const { Lead } = await import('../src/lib/mongoose/lead.ts')
  const { Project } = await import('../src/lib/mongoose/project.ts')

  // Create organization (idempotent find-or-create)
  const organization = await findOrCreateOrganization(Organization, 'Demo Agency', 'demo-agency')
  console.log(`Created organization: ${organization.name} (${organization._id})`)

  // Generate password at runtime — never hardcode one
  const passwordBytes = randomBytes(16)
  const demoPassword = `demo-${passwordBytes.toString('hex')}`
  const hashedPassword = await hashPassword(demoPassword)

  // Create admin user (find-or-create by email)
  const user = await findOrCreateUser(User, {
    email: 'admin@demo.com',
    name: 'Admin User',
    role: 'ADMIN',
    passwordHash: hashedPassword,
  })
  console.log(`Created user: ${user.email} (${user._id})`)
  console.log(`   Password: ${demoPassword}`)

  // Create membership
  await Membership.create({
    userId: user._id,
    organizationId: organization._id,
    role: 'ADMIN',
  })
  console.log('Created membership.')

  // Create sample client
  const client = await Client.create({
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Acme Corp',
    email: 'john@acme.com',
    phone: '+1 (555) 123-4567',
    status: 'active',
    organizationId: organization._id,
    createdById: user._id,
  })
  console.log('Created sample client.')

  // Create sample lead
  await Lead.create({
    title: 'Website Redesign for Acme',
    description: 'Complete website redesign project',
    email: 'john@acme.com',
    stage: 'NEW',
    value: 25000,
    source: 'REFERRAL',
    organizationId: organization._id,
    createdById: user._id,
  })
  console.log('Created sample lead.')

  // Create sample project
  await Project.create({
    name: 'Acme Website Redesign',
    description: 'Full website redesign with new branding',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 25000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    organizationId: organization._id,
    clientId: client._id,
    createdById: user._id,
  })
  console.log('Created sample project.')

  console.log('\n✅ Database seeded successfully!')
  console.log(`   Admin email: admin@demo.com`)
  console.log(`   Admin password: ${demoPassword}`)

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
