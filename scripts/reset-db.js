/**
 * Reset and seed the MongoDB database with initial data.
 * Run with: node scripts/reset-db.js
 */
import mongoose from 'mongoose'
import { User, Organization, Membership } from '../src/lib/mongoose/index.ts'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow'

// Safety guard: refuse to run without an explicit --force flag.
// This prevents accidental wiping of real data.
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
const dbMatch = MONGODB_URI.match(/\/([^/?]+)(\?|$)/)
const dbName = dbMatch ? dbMatch[1] : '(unknown)'
console.log(`⚠️  About to DROP database: ${dbName}`)
console.log(`   URI: ${MONGODB_URI}`)
console.log('')

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  // Clear existing data
  console.log('Clearing existing data...')
  await mongoose.connection.dropDatabase()
  console.log('Database cleared.')

  // Create organization
  const org = await Organization.create({
    name: 'Demo Agency',
    slug: 'demo-agency',
  })
  console.log(`Created organization: ${org.name} (${org._id})`)

  // Create admin user
  const { hash } = await import('bcryptjs')
  const hashedPassword = await hash('password123', 12)

  const user = await User.create({
    email: 'admin@demo.com',
    name: 'Admin User',
    password: hashedPassword,
    role: 'ADMIN',
  })
  console.log(`Created user: ${user.email} (${user._id})`)

  // Create membership
  await Membership.create({
    userId: user._id,
    organizationId: org._id,
    role: 'ADMIN',
  })
  console.log('Created membership.')

  // Create sample client
  const client = await import('../src/lib/mongoose/client.ts').then(m => m.Client)
  await client.create({
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Acme Corp',
    email: 'john@acme.com',
    phone: '+1 (555) 123-4567',
    status: 'active',
    organizationId: org._id,
    createdById: user._id,
  })
  console.log('Created sample client.')

  // Create sample lead
  const lead = await import('../src/lib/mongoose/lead.ts').then(m => m.Lead)
  await lead.create({
    title: 'Website Redesign for Acme',
    description: 'Complete website redesign project',
    email: 'john@acme.com',
    stage: 'NEW',
    value: 25000,
    source: 'REFERRAL',
    organizationId: org._id,
    createdById: user._id,
  })
  console.log('Created sample lead.')

  // Create sample project
  const project = await import('../src/lib/mongoose/project.ts').then(m => m.Project)
  await project.create({
    name: 'Acme Website Redesign',
    description: 'Full website redesign with new branding',
    status: 'ACTIVE',
    priority: 'HIGH',
    budget: 25000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    organizationId: org._id,
    clientId: (await client.findOne({ organizationId: org._id }))._id,
    createdById: user._id,
  })
  console.log('Created sample project.')

  console.log('\n✅ Database seeded successfully!')
  console.log('   Admin email: admin@demo.com')
  console.log('   Admin password: password123')

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
