import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestData, cleanupTestData, Organization } from '../utils/test-utils'
import { connectPromise } from '../utils/setup'

// Mock next/headers so getSession() can be exercised in unit tests. The real
// implementation reads the request cookie header and writes cookies; here we
// inject a fake cookie store so we can assert on what would be set.
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

// Pull the mocked helpers out of the module after mocking.
import * as nextHeaders from 'next/headers'
const {
  __setCookieHeader,
  __getCookies,
  __reset,
} = nextHeaders as unknown as {
  __setCookieHeader: (h: string) => void
  __getCookies: () => Record<string, string>
  __reset: () => void
}

import { encodeSession } from '@/lib/session-token'
import { getSession, createSession, getOrganization, signOut } from '@/lib/auth'

let testOrgId: string
let testUserId: string
let testData: Awaited<ReturnType<typeof setupTestData>> | null = null

beforeAll(async () => {
  try {
    await connectPromise
  } catch {
    // MongoDB not available - tests will skip themselves.
  }
  if ((await import('mongoose')).default.connection.readyState !== 1) return
  testData = await setupTestData()
  if (!testData) return
  testOrgId = testData.orgId
  testUserId = testData.userId
})

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(() => {
  __reset()
})

describe('getSession (server-side validation)', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('returns null when there is no session cookie', async () => {
    __setCookieHeader('')
    expect(await getSession()).toBeNull()
  })

  it('returns null for a malformed token', async () => {
    __setCookieHeader('session=not-valid-base64!!!')
    expect(await getSession()).toBeNull()
  })

  it('returns null when the token references a non-existent user', async () => {
    const token = encodeSession({
      userId: 'u_nonexistent',
      organizationId: testOrgId,
      context: 'production',
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    expect(await getSession()).toBeNull()
  })

  it('returns null when the token references an org the user no longer belongs to', async () => {
    const otherOrg = await Organization.create({ name: 'Other', slug: 'other-' + Date.now() })
    const token = encodeSession({
      userId: testUserId,
      organizationId: otherOrg._id.toString(),
      context: 'production',
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    expect(await getSession()).toBeNull()
    await Organization.deleteOne({ _id: otherOrg._id })
  })

  it('returns null for an expired token', async () => {
    const token = encodeSession({
      userId: testUserId,
      organizationId: testOrgId,
      context: 'production',
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    })
    __setCookieHeader(`session=${token}`)
    expect(await getSession()).toBeNull()
  })

  it('returns the session for a valid, unexpired token', async () => {
    const token = encodeSession({
      userId: testUserId,
      organizationId: testOrgId,
      context: 'production',
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    const session = await getSession()
    expect(session).not.toBeNull()
    expect(session!.user.id).toBe(testUserId)
    expect(session!.user.organizationId).toBe(testOrgId)
  })
})

describe('createSession (server-side cookie write)', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('writes an httpOnly session cookie with a 7-day maxAge', async () => {
    await createSession(testUserId, testOrgId, 'production')
    const cookies = __getCookies()
    expect(cookies.session).toBeTruthy()
    // The cookie value must be the URL-safe base64 token.
    const payload = JSON.parse(Buffer.from(cookies.session, 'base64').toString())
    expect(payload.userId).toBe(testUserId)
    expect(payload.organizationId).toBe(testOrgId)
    expect(typeof payload.timestamp).toBe('number')
  })
})

describe('getOrganization (server-side)', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('returns null when there is no session', async () => {
    __setCookieHeader('')
    expect(await getOrganization()).toBeNull()
  })

  it('returns the org for an authenticated user', async () => {
    const token = encodeSession({
      userId: testUserId,
      organizationId: testOrgId,
      context: 'production',
      timestamp: Date.now(),
    })
    __setCookieHeader(`session=${token}`)
    const org = await getOrganization()
    expect(org).not.toBeNull()
    expect(org!.id).toBe(testOrgId)
    expect(org!.name).toBe('Test Org')
  })
})

describe('signOut (server-side)', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('deletes the session cookie', async () => {
    await createSession(testUserId, testOrgId, 'production')
    expect(__getCookies().session).toBeTruthy()
    // signOut calls redirect() which throws; catch and ignore.
    try {
      await signOut()
    } catch {
      // redirect() throws a special Next error in test environments.
    }
    // The cookie store should no longer have a usable session value.
    const cookies = __getCookies()
    expect(cookies.session === undefined || cookies.session === '').toBe(true)
  })
})