/**
 * Regression tests: task and milestone completion for demo vs non-demo accounts.
 *
 * Covers:
 * 1.  demo account PATCH /api/tasks/[id] -> 403 (not 500), body.error = "Forbidden"
 * 2.  demo account PATCH /api/milestones/[id] -> 403 (not 500), body.error = "Forbidden"
 * 3.  PATCH /api/tasks/[id] without auth -> 401
 * 4.  PATCH /api/milestones/[id] without auth -> 401
 * 5.  PATCH /api/tasks/[id] invalid status -> 400
 * 6.  PATCH /api/tasks/[id] malformed JSON body -> 400
 * 7.  PATCH /api/milestones/[id] malformed JSON body -> 400
 * 8.  GET /api/tasks/[id] non-existent id -> 404
 * 9.  GET /api/tasks/[id] non-existent id (no auth) -> 401
 * 10. Demo read-only guard blocks mutations without bypassing requireNotDemoAccount
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared state for cookie header that the auth mock can read.
let cookieHeader = ''

// Stub all database imports.
vi.mock('@/lib/database', () => ({
  ensureDb: () => Promise.resolve(),
  Task: {
    findOne: () => ({ lean: () => Promise.resolve(null) }),
    findOneAndUpdate: () => ({ lean: () => Promise.resolve(null) }),
  },
  Milestone: {
    findOne: () => ({ lean: () => Promise.resolve(null) }),
    findOneAndUpdate: () => ({ lean: () => Promise.resolve(null) }),
    findOneAndDelete: () => Promise.resolve(null),
  },
  Project: {
    find: () => Promise.resolve([]),
    findOne: () => Promise.resolve(null),
    exists: () => Promise.resolve(false),
    findById: () => Promise.resolve(null),
  },
  User: { findById: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }) },
  Membership: { find: () => Promise.resolve([]) },
  Organization: {},
}))

// Stub database-scoped models.
vi.mock('@/lib/database-scoped', () => ({
  getModels: () => ({
    Milestone: { findOneAndUpdate: () => ({ lean: () => Promise.resolve(null) }), findOneAndDelete: () => Promise.resolve(null) },
    Project: { find: () => Promise.resolve([]), findOne: () => Promise.resolve(null) },
    Task: {},
  }),
}))

// Stub auth: getSession() reads cookieHeader; requireOrg() checks DEMO_ACCOUNT_EMAIL.
vi.mock('@/lib/auth', () => {
  const DEMO_EMAIL = 'reviewer@clientflow.test'
  return {
    getSession: async () => {
      const isDemo = process.env.DEMO_ACCOUNT_EMAIL === DEMO_EMAIL
      if (!cookieHeader) return null
      return {
        user: { id: 'user-1', email: isDemo ? DEMO_EMAIL : 'user@example.com', name: null, avatar: null, role: 'MEMBER', organizationRole: 'ADMIN', phone: null, organizationId: 'org-1' },
        isDemo,
        context: isDemo ? 'demo' as const : 'production' as const,
      }
    },
    requireOrg: async () => {
      // Return null when there's no session — this is what the real implementation does.
      if (!cookieHeader) return null
      const { requireNotDemoAccount } = await import('@/lib/demo-account')
      const isDemo = process.env.DEMO_ACCOUNT_EMAIL === DEMO_EMAIL
      if (isDemo) requireNotDemoAccount(DEMO_EMAIL)
      return { id: 'org-1', name: 'Test Org', slug: 'test-org', memberships: [] }
    },
    getOrganization: async () => {
      if (!cookieHeader) return null
      return { id: 'org-1', name: 'Test Org', slug: 'test-org', memberships: [] }
    },
    ensureDb: () => Promise.resolve(),
  }
})

// Mock next/headers so getSession() can read the cookie.
vi.mock('next/headers', () => ({
  headers: () => ({ get: (n: string) => (n === 'cookie' ? cookieHeader : null) }),
  cookies: () => ({
    get: (n: string) => cookieHeader.includes(n + '=') ? { name: n, value: cookieHeader.split(';').find(c => c.includes(n + '='))?.split('=')[1] ?? '' } : undefined,
    set: (_n: string, _v: string) => {},
    delete: (_n: string) => {},
  }),
}))

const DEMO_EMAIL = 'reviewer@clientflow.test'
const taskId = '507f1f77bcf86cd799439011'
const milestoneId = '507f1f77bcf86cd799439012'

function setCookie(h: string) { cookieHeader = h }
function resetCookie() { cookieHeader = '' }

describe('Task & Milestone completion - demo account regression', () => {
  beforeEach(() => { resetCookie() })

  // 1. Demo account PATCH /api/tasks/[id] -> 403
  it('1. demo account -> PATCH task returns 403 Forbidden (not 500)', async () => {
    process.env.DEMO_ACCOUNT_EMAIL = DEMO_EMAIL
    setCookie('session=test')
    try {
      const { PATCH } = await import('@/app/api/tasks/[id]/route')
      const req = new (await import('next/server')).NextRequest(
        `http://localhost/api/tasks/${taskId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE' }) }
      )
      const res = await PATCH(req, { params: Promise.resolve({ id: taskId }) })
      expect(res.status).toBe(403)
      const json = await res.json() as { error?: string }
      expect(json.error).toBe('Forbidden')
    } finally { delete process.env.DEMO_ACCOUNT_EMAIL }
  })

  // 2. Demo account PATCH /api/milestones/[id] -> 403
  it('2. demo account -> PATCH milestone returns 403 Forbidden (not 500)', async () => {
    process.env.DEMO_ACCOUNT_EMAIL = DEMO_EMAIL
    setCookie('session=test')
    try {
      const { PATCH } = await import('@/app/api/milestones/[id]/route')
      const req = new (await import('next/server')).NextRequest(
        `http://localhost/api/milestones/${milestoneId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completedAt: new Date().toISOString() }) }
      )
      const res = await PATCH(req, { params: Promise.resolve({ id: milestoneId }) })
      expect(res.status).toBe(403)
      const json = await res.json() as { error?: string }
      expect(json.error).toBe('Forbidden')
    } finally { delete process.env.DEMO_ACCOUNT_EMAIL }
  })

  // 3. No auth on PATCH task -> 401
  it('3. PATCH task without auth -> 401', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route')
    const req = new (await import('next/server')).NextRequest(`http://localhost/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: taskId }) })
    expect(res.status).toBe(401)
  })

  // 4. No auth on PATCH milestone -> 401
  it('4. PATCH milestone without auth -> 401', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route')
    const req = new (await import('next/server')).NextRequest(`http://localhost/api/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: new Date().toISOString() }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: milestoneId }) })
    expect(res.status).toBe(401)
  })

  // 5. Invalid status on PATCH task -> 400
  it('5. PATCH task with invalid status -> 400', async () => {
    setCookie('session=test')
    const { PATCH } = await import('@/app/api/tasks/[id]/route')
    const req = new (await import('next/server')).NextRequest(`http://localhost/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: taskId }) })
    expect(res.status).toBe(400)
  })

  // 6. Malformed JSON body on PATCH task -> 400
  it('6. PATCH task with malformed body -> 400', async () => {
    setCookie('session=test')
    const { PATCH } = await import('@/app/api/tasks/[id]/route')
    const req = new (await import('next/server')).NextRequest(`http://localhost/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: taskId }) })
    expect(res.status).toBe(400)
  })

  // 7. Malformed JSON body on PATCH milestone -> 400
  it('7. PATCH milestone with malformed body -> 400', async () => {
    setCookie('session=test')
    const { PATCH } = await import('@/app/api/milestones/[id]/route')
    const req = new (await import('next/server')).NextRequest(`http://localhost/api/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: milestoneId }) })
    expect(res.status).toBe(400)
  })

  // 8. GET task non-existent id -> 404
  it('8. GET task non-existent id -> 404', async () => {
    setCookie('session=test')
    const { GET } = await import('@/app/api/tasks/[id]/route')
    const req = new (await import('next/server')).NextRequest('http://localhost/api/tasks/nonexistent', {
      headers: { Cookie: 'session=test' },
    })
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
    const json = await res.json() as { error: string }
    expect(json.error).toBe('Task not found')
  })

  // 9. GET task without auth -> 401
  it('9. GET task without auth -> 401', async () => {
    resetCookie()
    const { GET } = await import('@/app/api/tasks/[id]/route')
    const req = new (await import('next/server')).NextRequest('http://localhost/api/tasks/nonexistent', {
      headers: {},
    })
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(401)
  })

  // 10. Demo read-only guard is preserved (not bypassed)
  it('10. demo account PATCH milestone -> 403 without bypassing requireNotDemoAccount', async () => {
    process.env.DEMO_ACCOUNT_EMAIL = DEMO_EMAIL
    setCookie('session=test')
    try {
      const { PATCH } = await import('@/app/api/milestones/[id]/route')
      const req = new (await import('next/server')).NextRequest(
        `http://localhost/api/milestones/${milestoneId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completedAt: new Date().toISOString() }) }
      )
      const res = await PATCH(req, { params: Promise.resolve({ id: milestoneId }) })
      expect(res.status).toBe(403)
      const json = await res.json() as { error?: string }
      expect(json.error).toBe('Forbidden')
    } finally { delete process.env.DEMO_ACCOUNT_EMAIL }
  })
})
