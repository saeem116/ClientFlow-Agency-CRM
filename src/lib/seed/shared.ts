/**
 * Shared seed utilities for ClientFlow demo data seeding scripts.
 *
 * This module provides reusable helpers for:
 * - Generating secure random passwords at runtime
 * - Hashing passwords with bcrypt
 * - Creating or updating users (idempotent)
 * - Validating database URIs for safety
 *
 * Usage in seed scripts:
 *   import { generatePassword, hashPassword, findOrCreateUser } from './seed/shared'
 *
 * SAFETY RULES:
 *   - Passwords are ALWAYS generated at runtime using crypto.randomBytes()
 *   - No plaintext passwords are stored in source code
 *   - All seed scripts must validate the target database URI before connecting
 *   - Production/remote databases are refused by explicit configuration
 */
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'

// ─── Password Generation ──────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random password.
 *
 * Uses crypto.randomBytes() — never Date.now() + Math.random() (predictable).
 * Returns a hex string of the requested length (default: 32 hex chars = 16 bytes).
 */
export function generatePassword(byteLength = 16): string {
  const bytes = randomBytes(byteLength)
  return bytes.toString('hex')
}

/**
 * Hash a plaintext password using bcrypt with 12 rounds.
 *
 * Use `generatePassword()` to create the plaintext before hashing.
 */
export async function hashPassword(plaintext: string, rounds = 12): Promise<string> {
  return hash(plaintext, rounds)
}

// ─── URI Validation ────────────────────────────────────────────────────────────

/**
 * Extract the hostname from a MongoDB URI.
 *
 * Supports both standard and SRV formats:
 *   mongodb://user:pass@host:port/db
 *   mongodb+srv://user:pass@host/db
 */
export function extractMongoHost(uri: string): string | null {
  // mongodb+srv://<auth>@<host>/...
  const srvMatch = uri.match(/mongodb\+srv:\/\/[^@]+@([^/]+)/)
  if (srvMatch) {
    const hostPort = srvMatch[1]
    return hostPort.split(':')[0]
  }

  // mongodb://<auth>@<host>/... or mongodb://<host>/...
  const stdMatch = uri.match(/mongodb:\/\/(?:[^@]+@)?([^/]+)/)
  if (stdMatch) {
    return stdMatch[1].split(':')[0]
  }

  return null
}

/**
 * Parse the database name from a MongoDB URI.
 */
export function parseMongoDbName(uri: string): string | null {
  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/)
  return match ? match[1] : null
}

/**
 * Validate that a MongoDB URI targets a safe (local/test) database.
 *
 * Rejects:
 *   - URIs with remote/production hosts (not in allowlist)
 *   - URIs with wrong database name
 *   - Non-standard URI schemes
 */
export function validateSeedUri(
  uri: string,
  options?: {
    allowedHosts?: Set<string>
    requiredDbName?: string
  }
): { ok: boolean; error?: string } {
  // Validate scheme
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    return { ok: false, error: 'URI must use mongodb:// or mongodb+srv:// scheme' }
  }

  const host = extractMongoHost(uri)
  if (!host) {
    return { ok: false, error: 'Could not parse hostname from URI' }
  }

  // Check allowlist
  const allowedHosts = options?.allowedHosts || new Set(['localhost', '127.0.0.1', '::1'])
  if (!allowedHosts.has(host.toLowerCase())) {
    return {
      ok: false,
      error: `Host '${host}' is not allowed. Allowed hosts: ${[...allowedHosts].join(', ')}`,
    }
  }

  // Check database name
  if (options?.requiredDbName) {
    const dbName = parseMongoDbName(uri)
    if (!dbName || dbName !== options.requiredDbName) {
      return {
        ok: false,
        error: `Database name must be '${options.requiredDbName}', got '${dbName ?? 'unknown'}'`,
      }
    }
  }

  return { ok: true }
}

// ─── User Creation ─────────────────────────────────────────────────────────────

export interface SeedUserOptions {
  email: string
  name: string
  role: 'ADMIN' | 'MEMBER' | 'CLIENT'
  passwordHash?: string
  /** Password bytes (will be hashed) if no passwordHash provided */
  passwordBytes?: Buffer
}

/**
 * Find or create a user with the given email.
 *
 * If the user exists, returns it without modification.
 * If not, creates the user with the provided credentials.
 *
 * @returns The user document (found or created)
 */
export async function findOrCreateUser<M>(
  model: M,
  options: SeedUserOptions
): Promise<M & { _id: { toString(): string }; email: string }> {
  const { email, name, role, passwordHash, passwordBytes } = options

  // Find existing user
  const existing = await (model as any).findOne({ email: email.toLowerCase().trim() }).lean()
  if (existing) {
    return existing as M & { _id: { toString(): string }; email: string }
  }

  // Generate password if not provided
  const plaintext = passwordBytes
    ? passwordBytes.toString('hex')
    : generatePassword()

  const hashed = passwordHash || await hashPassword(plaintext)

  const user = await (model as any).create({
    email: email.toLowerCase().trim(),
    name,
    password: hashed,
    role,
  })

  return user as M & { _id: { toString(): string }; email: string }
}

// ─── Organization Creation ─────────────────────────────────────────────────────

/**
 * Find or create an organization with a unique slug.
 *
 * Uses a timestamp-based suffix to ensure uniqueness.
 */
export async function findOrCreateOrganization<M>(
  model: M,
  name: string,
  slugPrefix: string
): Promise<M & { _id: { toString(): string }; name: string; slug: string }> {
  let org = await (model as any).findOne({ name }).lean()
  if (org) {
    return org as M & { _id: { toString(): string }; name: string; slug: string }
  }

  // Generate unique slug
  const slug = `${slugPrefix}-${Date.now()}`
  org = await (model as any).create({ name, slug })
  return org as M & { _id: { toString(): string }; name: string; slug: string }
}
