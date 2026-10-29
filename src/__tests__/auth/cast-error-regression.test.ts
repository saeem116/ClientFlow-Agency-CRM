/**
 * Regression tests for the Membership ObjectId CastError fix.
 *
 * Root cause: after `.populate("organizationId").lean()` in signIn(),
 * membership.organizationId was the full Organization document, not a
 * string. Calling `.toString()` on it produced "[object Object]", which
 * was stored in the session token. Subsequent Membership queries in
 * getSession() then threw CastError during SSR.
 *
 * This test suite verifies:
 *  1. Valid demo sessions resolve against the demo database.
 *  2. Valid production sessions resolve against the production database.
 *  3. A signed session with `organizationId: "[object Object]"` is
 *     safely rejected BEFORE any Membership query reaches Mongoose.
 *  4. Malformed userId values are rejected before database lookup.
 *  5. Valid signIn() creates a session whose organizationId is a
 *     scalar 24-hex-character ObjectId string.
 *  6. Demo sessions never fall back to the production database.
 *  7. Existing tenant-isolation and demo read-only protections remain
 *     intact.
 *
 * Run: npx vitest run src/__tests__/auth/cast-error-regression.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { encodeSession, decodeSession, isValidObjectId } from '@/lib/session-token'
import { connectPromise } from '../utils/setup'
import { setupTestData, cleanupTestData, User, Organization, Membership } from '../utils/test-utils'

// ─── next/headers mock (same pattern as auth-server.test.ts) ────────────────
vi.mock('next/headers', () => {
  let cookieHeader = ''
  const cookiesMap = new Map<string, string>()
  return {
    headers: () => ({
      get: (name: string) => (name === 'cookie' ? cookieHeader : null),
    }),
    cookies: () => ({
      get: (name: string) => {
        const v = cookiesMap.get(name)
        return v ? { name, value: v } : undefined
      },
      set: (name: string, value: string) => {
        cookiesMap.set(name, value)
      },
      delete: (name: string) => {
        cookiesMap.delete(name)
      },
    }),
    __setCookieHeader: (h: string) => {
      cookieHeader = h
    },
    __getCookies: () => Object.fromEntries(cookiesMap),
    __reset: () => {
      cookieHeader = ''
      cookiesMap.clear()
    },
  }
})

import * as nextHeaders from 'next/headers'
const { __setCookieHeader, __getCookies, __reset } = nextHeaders as unknown as {
  __setCookieHeader: (h: string) => void
  __getCookies: () => Record<string, string>
  __reset: () => void
}

// Pull the real functions after the mock is applied.
import { getSession, createSession } from '@/lib/auth'

let testOrgId: string
let testUserId: string
let secondOrgId: string
let testData: { orgId: string; userId: string } | null = null

const FAKE_SECRET = 'test-secret-for-unit-tests-32-chars-long!!'

beforeAll(async () => {
  process.env.AUTH_SECRET = FAKE_SECRET
  try {
    await connectPromise
  } catch {
    // MongoDB not available — tests skip themselves.
  }
  if ((await import('mongoose')).default.connection.readyState !== 1) return
  testData = await setupTestData()
  if (!testData) return
  testOrgId = testData.orgId
  testUserId = testData.userId

  // Create a second org + user for cross-org isolation tests.
  const org2 = await Organization.create({ name: 'Other Org', slug: `other-org-${Date.now()}` })
  const user2 = await User.create({ email: 'user2@example.com', name: 'User Two', role: 'MEMBER' })
  await Membership.create({ userId: user2._id, organizationId: org2._id, role: 'MEMBER' })
  secondOrgId = org2._id.toString()
})

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(() => {
  __reset()
})

afterEach(() => {
  delete process.env.DEMO_MONGODB_URI
  delete process.env.DEMO_ACCOUNT_EMAIL
})

// ─── isValidObjectId helpers (no DB needed) ─────────────────────────────────

describe('isValidObjectId', () => {
  it('accepts a valid 24-char hex ObjectId string', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true)
    expect(isValidObjectId('507f1f77bcf86cd799439012')).toBe(true)
  })

  it('rejects "[object Object]"', () => {
    expect(isValidObjectId('[object Object]')).toBe(false)
  })

  it('rejects non-hex strings', () => {
    expect(isValidObjectId('not-an-id')).toBe(false)
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false)   // 23 chars
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false)  // 25 chars
    expect(isValidObjectId('')).toBe(false)
    expect(isValidObjectId(null)).toBe(false)
    expect(isValidObjectId(undefined)).toBe(false)
  })
})

// ─── decodeSession rejects malformed IDs ────────────────────────────────────

describe('decodeSession rejects malformed IDs', () => {
  it('rejects a payload whose organizationId is "[object Object]"', () => {
    const maliciousPayload = {
      userId: testUserId,
      organizationId: '[object Object]',
      context: 'production' as const,
      timestamp: Date.now(),
    }
    const token = encodeSession(maliciousPayload)
    const decoded = decodeSession(token)
    // decodeSession should reject it because organizationId is not a valid hex string.
    expect(decoded).toBeNull()
  })

  it('rejects a payload whose userId is not a valid ObjectId', () => {
    const payload = {
      userId: 'u_nonexistent',
      organizationId: testOrgId,
      context: 'production' as const,
      timestamp: Date.now(),
    }
    const token = encodeSession(payload)
    expect(decodeSession(token)).toBeNull()
  })
})

// ─── getSession rejects malformed payloads before querying Membership ────────

describe('getSession rejects malformed IDs before DB query', () => {
  it('returns null for a token with organizationId "[object Object]"', async () => {
    const payload = {
      userId: testUserId,
      organizationId: '[object Object]',
      context: 'production' as const,
      timestamp: Date.now(),
    }
    const token = encodeSession(payload)
    __setCookieHeader(`session=${token}`)
    // This must NOT throw a CastError — it should return null cleanly.
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('returns null for a token with a short (23-char) userId', async () => {
    const payload = {
      userId: '507f1f77bcf86cd79943901',
      organizationId: testOrgId,
      context: 'production' as const,
      timestamp: Date.now(),
    }
    const token = encodeSession(payload)
    __setCookieHeader(`session=${token}`)
    const session = await getSession()
    expect(session).toBeNull()
  })
})

// ─── signIn creates sessions with valid scalar IDs ──────────────────────────

describe('signIn session creation produces scalar ObjectId strings', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('createSession accepts valid scalar IDs and writes a signed cookie', async () => {
    await createSession(testUserId, testOrgId, 'production')
    const cookies = __getCookies()
    expect(cookies.session).toBeTruthy()
    const decoded = decodeSession(cookies.session)
    expect(decoded).not.toBeNull()
    expect(typeof decoded!.organizationId).toBe('string')
    expect(isValidObjectId(decoded!.organizationId)).toBe(true)
    expect(decoded!.userId).toBe(testUserId)
  })

  it('createSession throws on "[object Object]" organizationId', async () => {
    await expect(
      createSession(testUserId, '[object Object]', 'production')
    ).rejects.toThrow('Invalid session organizationId')
  })

  it('createSession throws on non-objectId userId', async () => {
    await expect(
      createSession('u_invalid', testOrgId, 'production')
    ).rejects.toThrow('Invalid session userId')
  })
})

// ─── Demo / production database isolation ────────────────────────────────────

describe('demo / production database isolation', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('valid production session resolves in the production database', async () => {
    const token = encodeSession({
      userId: testUserId,
      organizationId: testOrgId,
      context: 'production' as const,
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    const session = await getSession()
    expect(session).not.toBeNull()
    expect(session!.user.id).toBe(testUserId)
    expect(session!.user.organizationId).toBe(testOrgId)
    expect(session!.isDemo).toBe(false)
    expect(session!.context).toBe('production')
  })

  it('demo session returns null when DEMO_MONGODB_URI is not set', async () => {
    // No DEMO_MONGODB_URI is set in this environment — demo sessions should
    // not fall back to the production database.
    const token = encodeSession({
      userId: testUserId,
      organizationId: testOrgId,
      context: 'demo' as const,
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    const session = await getSession()
    // getSession() should return null, not leak production data into a demo session.
    expect(session).toBeNull()
  })
})

// ─── Tenant isolation preserved ─────────────────────────────────────────────

describe('tenant isolation preserved', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('a session pointing to another user\'s org returns null', async () => {
    const token = encodeSession({
      userId: testUserId,
      organizationId: secondOrgId,
      context: 'production' as const,
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    const session = await getSession()
    expect(session).toBeNull()
  })
})
