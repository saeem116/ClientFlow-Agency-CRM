/**
 * Wait for MongoDB to be ready, then run the migration.
 *
 * Usage: node scripts/wait-for-mongo.mjs
 *
 * Environment:
 *   MONGODB_URI - MongoDB connection string (default: mongodb://localhost:27017/clientflow-test)
 */
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientflow-test'

async function waitForMongo() {
  console.log(`Waiting for MongoDB at ${MONGODB_URI}...`)
  for (let i = 0; i < 30; i++) {
    try {
      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 2000,
      })
      await client.connect()
      await client.db().admin().ping()
      await client.close()
      console.log('MongoDB is ready')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`Waiting for MongoDB... (attempt ${i + 1}/30) — ${msg}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  console.error('MongoDB did not become ready after 30 attempts')
  process.exit(1)
}

await waitForMongo()

// Now run the migration
const { execSync } = await import('child_process')
const migration = process.env.MIGRATION_SCRIPT || 'database/migrations/001-create-indexes.mjs'
console.log(`Running migration: ${migration}`)
try {
  execSync(`npx tsx ${migration}`, { stdio: 'inherit' })
} catch (err) {
  console.error('Migration failed')
  process.exit(1)
}