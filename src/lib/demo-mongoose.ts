/**
 * Demo database connection manager.
 *
 * The app runs two Mongoose connections:
 *   - Production: `MONGODB_URI`           (single global instance via mongodb.ts)
 *   - Demo:       `DEMO_MONGODB_URI`     (second instance, separate models)
 *
 * Why two instances? Mongoose caches models on the instance that first
 * creates them (`mongoose.models.X || model(...)`). Calling connectDemoDb()
 * mid-request won't make existing production models switch databases.
 * A second instance gives us clean isolation without mutating globals.
 *
 * Safety:
 *   - DEMO_MONGODB_URI MUST have the database name exactly `clientflow_demo`.
 *   - URIs must use a standard MongoDB connection scheme.
 *   - The app will refuse to connect if DEMO_MONGODB_URI is misconfigured.
 */
import mongoose, { type Mongoose } from "mongoose"

const globalThisForMongoose = globalThis as unknown as {
  demoMongoose?: Mongoose
}

function getOrCreateDemoMongoose(): Mongoose | null {
  if (globalThisForMongoose.demoMongoose) {
    return globalThisForMongoose.demoMongoose
  }

  const demoUri = process.env.DEMO_MONGODB_URI
  if (!demoUri) return null

  // Validate URI before connecting.
  const validation = validateDemoUri(demoUri)
  if (!validation.ok) {
    console.error(`[demo-mongoose] Invalid DEMO_MONGODB_URI: ${validation.error}`)
    return null
  }

  // Create a fresh Mongoose instance for the demo database.
  const demoMongoose = new mongoose.Mongoose()
  globalThisForMongoose.demoMongoose = demoMongoose
  return demoMongoose
}

/**
 * Validate DEMO_MONGODB_URI:
 *   - Must use mongodb:// or mongodb+srv:// scheme.
 *   - Database name must be exactly `clientflow_demo`.
 *   - Must not be empty or malformed.
 */
function validateDemoUri(uri: string): { ok: boolean; error?: string } {
  // Check scheme — reject anything that isn't a standard MongoDB URI.
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    return { ok: false, error: "URI must use mongodb:// or mongodb+srv:// scheme" }
  }

  // Parse the database name: last segment after the final slash before query params
  const dbMatch = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/)
  if (!dbMatch) {
    return { ok: false, error: "Could not parse database name from URI" }
  }
  const dbName = dbMatch[1]
  if (dbName !== "clientflow_demo") {
    return {
      ok: false,
      error: `Database name must be 'clientflow_demo', got '${dbName}'`,
    }
  }

  return { ok: true }
}

/**
 * Connect to the demo database, returning the demo Mongoose instance.
 *
 * Returns null ONLY when DEMO_MONGODB_URI is not configured at all — in that
 * case the app simply has no demo account to offer and falls through to the
 * production flow.  Any connection failure (unreachable host, bad credentials,
 * timeout) is thrown so callers can surface a meaningful "temporarily
 * unavailable" message instead of a misleading "not configured" one.
 */
export async function connectDemoDb(): Promise<Mongoose | null> {
  const m = getOrCreateDemoMongoose()
  if (!m) return null

  // Check if already connected (or in the process of connecting).
  if (m.connection.readyState >= 1) {
    return m
  }

  await m.connect(process.env.DEMO_MONGODB_URI!, {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  })
  return m
}

/**
 * Ensure the demo database is connected. In production builds, return null
 * instead of throwing so the build can proceed.
 */
export async function ensureDemoDb(): Promise<Mongoose | null> {
  try {
    return await connectDemoDb()
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn("[demo-mongoose] Demo DB unavailable during build — proceeding without it.")
      return null
    }
    console.error("[demo-mongoose] Connection error:", error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * Disconnect the demo database when the process exits.
 */
export async function disconnectDemoDb(): Promise<void> {
  if (globalThisForMongoose.demoMongoose) {
    try {
      await globalThisForMongoose.demoMongoose.disconnect()
    } catch { /* ignore */ }
    globalThisForMongoose.demoMongoose = undefined
  }
}

/**
 * Get the demo Mongoose instance (connected or not).
 */
export function getDemoMongoose(): Mongoose | null {
  return globalThisForMongoose.demoMongoose ?? null
}

/**
 * Check whether the demo database is configured and validated.
 */
export function isDemoConfigured(): boolean {
  const uri = process.env.DEMO_MONGODB_URI
  if (!uri) return false
  const validation = validateDemoUri(uri)
  if (!validation.ok) {
    console.error(`[demo-mongoose] Invalid DEMO_MONGODB_URI: ${validation.error}`)
    return false
  }
  return true
}
