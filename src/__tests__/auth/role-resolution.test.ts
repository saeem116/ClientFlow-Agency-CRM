/**
 * Regression tests for the dual-role model:
 *   - `role` is the account-level role stored on the User document (always
 *     "MEMBER" for normal signups; admin access is decided by ADMIN_EMAIL).
 *   - `organizationRole` is the workspace-level role resolved from the
 *     Membership that links the user to their active organization.
 *
 * A newly signed-up user should be ADMIN of their own workspace, not just
 * a plain "MEMBER" everywhere.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { encodeSession } from '@/lib/session-token'
import { hashPassword } from '@/lib/bcrypt'
import { setupTestData, cleanupTestData, User, Organization, Membership } from '../utils/test-utils'
import { connectPromise } from '../utils/setup'
import { vi } from 'vitest'

// Mock next/headers so we can set a session cookie.
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
      set: (name: string, value: string) => { cookiesMap.set(name, value) },
      delete: (name: string) => { cookiesMap.delete(name) },
    }),
    __setCookieHeader: (h: string) => { cookieHeader = h },
    __reset: () => { cookieHeader = ''; cookiesMap.clear() },
  }
})

import * as nextHeaders from 'next/headers'
const { __setCookieHeader, __reset } = nextHeaders as any

describe('Role resolution — account vs organization role', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>> | null = null
  let testOrgId: string
  let testUserId: string
  let testToken: string

  beforeEach(async () => {
    try { await connectPromise } catch { /* MongoDB not available */ }
    if ((await import('mongoose')).default.connection.readyState !== 1) return
    testData = await setupTestData()
    if (!testData) return
    testOrgId = testData.orgId
    testUserId = testData.userId
    testToken = encodeSession({ userId: testUserId, organizationId: testOrgId, context: 'production', timestamp: Date.now() })
    __reset()
    __setCookieHeader(`session=${testToken}`)
  })

  afterEach(async () => {
    __reset()
    await cleanupTestData()
  })

  if (!testData) {
    it.skip('MongoDB not available - skipping all tests', () => {})
    return
  }

  it('returns organizationRole from Membership, not User.role', async () => {
    // testData created the user with role: 'MEMBER' on User
    // but the membership was also 'ADMIN'.
    const { getSession } = await import('@/lib/auth')
    const session = await getSession()
    expect(session).not.toBeNull()
    expect(session!.user.id).toBe(testUserId)
    // Account-level role is MEMBER (as stored on User)
    expect(session!.user.role).toBe('MEMBER')
    // Organization-level role is ADMIN (from the Membership)
    expect(session!.user.organizationRole).toBe('ADMIN')
  })

  it('signup creates user with MEMBER account role + ADMIN organizationRole', async () => {
    const { POST: signup } = await import('@/app/api/auth/signup/route')
    const timestamp = Date.now()
    const request = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `signup-role-${timestamp}@example.com`,
        name: 'Role Test User',
        password: 'password123',
      }),
    })

    const response = await signup(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.user.role).toBe('MEMBER')
    expect(data.user.organizationRole).toBe('ADMIN')
  })

  it('invited user gets the invitation-delegated organizationRole, not account role', async () => {
    // An invited user who already exists with role: 'MEMBER' is invited as 'ADMIN'
    // The session should surface organizationRole: 'ADMIN' (from the new membership).
    const timestamp = Date.now()

    // Create an existing user (account-level MEMBER)
    const existingUser = await User.create({
      email: `invitee-${timestamp}@example.com`,
      name: 'Existing Invitee',
      role: 'MEMBER',
    })

    // Create a separate org and membership for the invitee as ADMIN
    const inviteOrg = await Organization.create({
      name: `Invitee Org ${timestamp}`,
      slug: `invitee-org-${timestamp}`,
    })
    await Membership.create({
      userId: existingUser._id,
      organizationId: inviteOrg._id,
      role: 'ADMIN',
    })

    // Build a session token pointed at the invite org
    const inviteToken = encodeSession({
      userId: existingUser._id.toString(),
      organizationId: inviteOrg._id.toString(),
      context: 'production',
      timestamp: Date.now(),
    })
    __reset()
    __setCookieHeader(`session=${inviteToken}`)

    const { getSession } = await import('@/lib/auth')
    const session = await getSession()
    expect(session).not.toBeNull()
    // Account role stays as-is on User
    expect(session!.user.role).toBe('MEMBER')
    // Org role is ADMIN from the Membership
    expect(session!.user.organizationRole).toBe('ADMIN')
  })
})
