import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/demo-login/route'
import { connectDemoDb } from '@/lib/demo-mongoose'
import { isDemoAccount } from '@/lib/demo-account'

// Mock dependencies
vi.mock('@/lib/demo-mongoose', () => ({
  connectDemoDb: vi.fn(),
}))

// findOne returns a chainable query-like object: findOne(...).lean() resolves to the value
function makeQueryMock<T>(defaultValue: T) {
  const lean = vi.fn().mockResolvedValue(defaultValue)
  return { lean }
}

const mockDemoUser = {
  findOne: vi.fn(() => makeQueryMock(null)),
}
const mockDemoMembership = {
  findOne: vi.fn(() => makeQueryMock(null)),
}

vi.mock('@/lib/database-demo', () => ({
  User: vi.fn(() => mockDemoUser),
  Membership: vi.fn(() => mockDemoMembership),
}))

vi.mock('@/lib/demo-account', () => ({
  isDemoAccount: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
}))

vi.mock('@/lib/session-token', () => ({
  encodeSession: vi.fn((payload: unknown) => `mock-token-${JSON.stringify(payload)}`),
}))

const mockConnectDemoDb = vi.mocked(connectDemoDb)
const mockIsDemoAccount = vi.mocked(isDemoAccount)

describe('demo-login API', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(null)
    mockIsDemoAccount.mockReturnValue(true)
    mockConnectDemoDb.mockResolvedValue({} as Awaited<ReturnType<typeof connectDemoDb>>)

    // Reset query mocks
    mockDemoUser.findOne.mockImplementation(() => makeQueryMock(null))
    mockDemoMembership.findOne.mockImplementation(() => makeQueryMock(null))
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 for invalid persona', async () => {
    const request = new NextRequest('http://localhost/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ persona: 'invalid' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid persona')
  })

  it('returns 400 for missing persona', async () => {
    const request = new NextRequest('http://localhost/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 503 when demo database not configured', async () => {
    mockConnectDemoDb.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ persona: 'member' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(503)
  })

  it('returns 404 when demo user not found', async () => {
    mockDemoUser.findOne.mockImplementation(() => makeQueryMock(null))

    const request = new NextRequest('http://localhost/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ persona: 'member' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
  })
})