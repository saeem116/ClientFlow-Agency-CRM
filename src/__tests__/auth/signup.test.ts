import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { setupTestData, cleanupTestData, User, Organization, Membership } from '../utils/test-utils'
import { connectPromise } from '../utils/setup'

// Mock next/headers so we can test signup in isolation
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

let testData: { orgId: string; userId: string } | null = null

beforeAll(async () => {
  try {
    await connectPromise
  } catch {
    // MongoDB not available - tests will skip themselves.
  }
  if ((await import('mongoose')).default.connection.readyState !== 1) return
  testData = await setupTestData()
})

afterAll(async () => {
  await cleanupTestData()
})

beforeEach(async () => {
  // Clean up any test users between tests
  await User.deleteMany({ email: { $regex: /@signup-test\.com$/i } })
})

describe('Signup API', () => {
  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('should create a new user with valid data', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@signup-test.com',
        name: 'New User',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('newuser@signup-test.com')
    expect(data.user.name).toBe('New User')

    // Verify user was created in DB
    const user = await User.findOne({ email: 'newuser@signup-test.com' })
    expect(user).not.toBeNull()
    expect(user?.password).toBeDefined()
    expect(user?.password).not.toBe('password123') // Should be hashed

    // Verify organization was created
    const org = await Organization.findOne({ name: "New User's Workspace" })
    expect(org).not.toBeNull()

    // Verify membership was created
    const membership = await Membership.findOne({
      userId: user?._id,
      role: 'ADMIN',
    })
    expect(membership).not.toBeNull()
  })

  it('should reject duplicate email', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const payload = {
      email: 'duplicate@signup-test.com',
      name: 'Duplicate User',
      password: 'password123',
    }

    // First signup
    const request1 = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const response1 = await POST(request1)
    expect(response1.status).toBe(200)

    // Second signup with same email
    const request2 = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const response2 = await POST(request2)
    const data2 = await response2.json()

    expect(response2.status).toBe(400)
    expect(data2.error).toContain('already exists')
  })

  it('should normalize email to lowercase', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'MixedCase@Signup-Test.Com',
        name: 'Case User',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const user = await User.findOne({ email: 'mixedcase@signup-test.com' })
    expect(user).not.toBeNull()
  })

  it('should reject weak password', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weak@signup-test.com',
        name: 'Weak Password User',
        password: 'short',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('at least 8 characters')

    // Verify user was not created
    const user = await User.findOne({ email: 'weak@signup-test.com' })
    expect(user).toBeNull()
  })

  it('should reject missing fields', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')

    // Missing email
    let request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', password: 'password123' }),
    })
    let response = await POST(request)
    expect(response.status).toBe(400)

    // Missing password
    request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@signup-test.com', name: 'Test' }),
    })
    response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should handle database errors gracefully', async () => {
    // Temporarily mock Organization.create to throw a duplicate key error
    const originalCreate = Organization.create.bind(Organization)
    Organization.create = async () => {
      const error = new Error('Duplicate key') as Error & { code: number; keyPattern: Record<string, unknown> }
      error.code = 11000
      error.keyPattern = { slug: 1 }
      throw error
    }

    try {
      const { POST } = await import('@/app/api/auth/signup/route')
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'error@signup-test.com',
          name: 'Error User',
          password: 'password123',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      // User should not be created
      const user = await User.findOne({ email: 'error@signup-test.com' })
      expect(user).toBeNull()
    } finally {
      // Restore original function
      Organization.create = originalCreate
    }
  })
})
