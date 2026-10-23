/**
 * Auth guard tests for mutating API routes.
 * Verifies 401 for unauthenticated and malformed-token requests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { setupTestData, cleanupTestData } from '../utils/test-utils'
import { encodeSession } from '@/lib/session-token'

describe('Mutating Routes — Auth Guards', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>> = null
  let testOrgId = ''
  let testUserId = ''

  beforeAll(async () => {
    testData = await setupTestData()
    if (testData) {
      testOrgId = testData.orgId
      testUserId = testData.userId
    }
  }, 30000)

  afterAll(async () => {
    await cleanupTestData()
  })

  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  function makeToken(): string {
    return encodeSession({
      userId: testUserId,
      organizationId: testOrgId,
      context: 'production',
      timestamp: Date.now(),
    })
  }

  const validToken = makeToken()

  // ── POST /api/tasks ─────────────────────────────────────────────────────
  it('POST /api/tasks → 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/tasks/route')
    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task', status: 'BACKLOG', priority: 'MEDIUM' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/tasks → 401 with malformed token', async () => {
    const { POST } = await import('@/app/api/tasks/route')
    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=bad-token!!!',
      },
      body: JSON.stringify({ title: 'Task', status: 'BACKLOG', priority: 'MEDIUM' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // ── POST /api/clients ───────────────────────────────────────────────────
  it('POST /api/clients → 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const req = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'X', lastName: 'Y', email: 'x+y@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // ── POST /api/projects ─────────────────────────────────────────────────
  it('POST /api/projects → 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/projects/route')
    const req = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Project', status: 'DRAFT', priority: 'MEDIUM' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // ── POST /api/milestones ───────────────────────────────────────────────
  it('POST /api/milestones → 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Milestone' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // ── PATCH /api/tasks/[id] ──────────────────────────────────────────────
  it('PATCH /api/tasks/[id] → 401 without auth cookie', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route')
    const req = new NextRequest('http://localhost/api/tasks/some-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'some-id' }) } as never)
    expect(res.status).toBe(401)
  })

  it('PATCH /api/tasks/[id] → 404 for non-existent task (with auth)', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route')
    const req = new NextRequest('http://localhost/api/tasks/nonexistent-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `session=${validToken}` },
      body: JSON.stringify({ status: 'DONE' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent-id' }) } as never)
    const json = (await res.json()) as { error: string }
    expect(res.status).toBe(404)
    expect(json.error).toBe('Task not found')
  })

  // ── PATCH /api/milestones/[id] ─────────────────────────────────────────
  it('PATCH /api/milestones/[id] → 401 without auth cookie', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest('http://localhost/api/milestones/some-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'some-id' }) } as never)
    expect(res.status).toBe(401)
  })

  // ── DELETE /api/projects/[id] ─────────────────────────────────────────
  it('DELETE /api/projects/[id] → 401 without auth cookie', async () => {
    const { DELETE } = await import('@/app/api/projects/[id]/route')
    const req = new NextRequest('http://localhost/api/projects/some-id', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'some-id' }) } as never)
    expect(res.status).toBe(401)
  })

  // ── DELETE /api/milestones/[id] ────────────────────────────────────────
  it('DELETE /api/milestones/[id] → 401 without auth cookie', async () => {
    const { DELETE } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest('http://localhost/api/milestones/some-id', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'some-id' }) } as never)
    expect(res.status).toBe(401)
  })

  // ── POST /api/invoices/[id]/payment ────────────────────────────────────
  it('POST /api/invoices/[id]/payment → 401 without auth cookie', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/payment/route')
    const req = new NextRequest('http://localhost/api/invoices/some-id/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100, method: 'BANK_TRANSFER' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'some-id' }) } as never)
    expect(res.status).toBe(401)
  })
})
