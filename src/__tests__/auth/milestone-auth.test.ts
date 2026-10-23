/**
 * Milestone auth and business-logic tests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { setupTestData, cleanupTestData, Milestone, Project } from '../utils/test-utils'
import { encodeSession } from '@/lib/session-token'

describe('Milestone Auth & Logic', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>> = null
  let testOrgId = ''
  let testUserId = ''
  let projectId = ''

  beforeAll(async () => {
    testData = await setupTestData()
    if (!testData) return
    testOrgId = testData.orgId
    testUserId = testData.userId

    const p = await Project.create({
      name: 'Auth Test Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      organizationId: testOrgId,
      createdById: testUserId,
    })
    projectId = p._id.toString()
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

  // ── GET /api/milestones ─────────────────────────────────────────────────
  it('GET /api/milestones → 401 without auth', async () => {
    const { GET } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/milestones → 200 with valid token', async () => {
    const { GET } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones', {
      headers: { Cookie: `session=${validToken}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = (await res.json()) as unknown[]
    expect(Array.isArray(json)).toBe(true)
  })

  // ── POST /api/milestones ───────────────────────────────────────────────
  it('POST /api/milestones → 401 without auth', async () => {
    const { POST } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Milestone', projectId }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/milestones → 400 for empty title', async () => {
    const { POST } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `session=${validToken}` },
      body: JSON.stringify({ title: '', projectId }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('POST /api/milestones → 201 creates milestone with valid data', async () => {
    const { POST } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `session=${validToken}` },
      body: JSON.stringify({ title: 'Valid Milestone', projectId }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = (await res.json()) as { title: string; projectId: { toString: () => string } }
    expect(json.title).toBe('Valid Milestone')
  })

  // ── PATCH /api/milestones/[id] ─────────────────────────────────────────
  it('PATCH /api/milestones/[id] → 401 without auth', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest('http://localhost/api/milestones/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) } as never)
    expect(res.status).toBe(401)
  })

  it('PATCH /api/milestones/[id] → 404 for non-existent milestone', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest('http://localhost/api/milestones/nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `session=${validToken}` },
      body: JSON.stringify({ title: 'Updated' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) } as never)
    expect(res.status).toBe(404)
  })

  it('PATCH /api/milestones/[id] → 200 updates existing milestone', async () => {
    const m = await Milestone.create({ title: 'Patch Target', projectId })
    const { PATCH } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest(`http://localhost/api/milestones/${m._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: `session=${validToken}` },
      body: JSON.stringify({ title: 'Patched Title' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: m._id.toString() }) } as never)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { title: string }
    expect(json.title).toBe('Patched Title')
  })

  // ── DELETE /api/milestones/[id] ────────────────────────────────────────
  it('DELETE /api/milestones/[id] → 401 without auth', async () => {
    const { DELETE } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest('http://localhost/api/milestones/abc', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'abc' }) } as never)
    expect(res.status).toBe(401)
  })

  it('DELETE /api/milestones/[id] → 200 removes existing milestone', async () => {
    const m = await Milestone.create({ title: 'Delete Target', projectId })
    const { DELETE } = await import('@/app/api/milestones/[id]/route')
    const req = new NextRequest(`http://localhost/api/milestones/${m._id}`, {
      headers: { Cookie: `session=${validToken}` },
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: m._id.toString() }) } as never)
    expect(res.status).toBe(200)
    const remaining = await Milestone.find({ projectId }).lean() as unknown as Array<{ _id: { toString: () => string } }>
    expect(remaining.some((item) => item._id.toString() === m._id.toString())).toBe(false)
  })

  // ── Cross-org isolation ────────────────────────────────────────────────
  it('milestones are scoped to the creating project\'s org', async () => {
    await Milestone.create({ title: 'Org A Milestone', projectId })
    const { GET } = await import('@/app/api/milestones/route')
    const req = new NextRequest('http://localhost/api/milestones', {
      headers: { Cookie: `session=${validToken}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { title: string }[]
    expect(json.some((item) => item.title === 'Org A Milestone')).toBe(true)
  })
})
