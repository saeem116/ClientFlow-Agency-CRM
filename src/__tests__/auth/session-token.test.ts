import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encodeSession,
  decodeSession,
  isSessionExpired,
  SESSION_MAX_AGE_MS,
  getSessionSecret,
  type SessionPayload,
} from '@/lib/session-token'

// Helper to set NODE_ENV (typed as read-only in TypeScript lib.dom.d.ts).
function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

describe('session-token', () => {
  const originalSecret = process.env.AUTH_SECRET
  const originalNodeEnv = process.env.NODE_ENV
  const fakeSecret = 'test-secret-for-unit-tests-32-chars-long!!'

  beforeEach(() => {
    process.env.AUTH_SECRET = fakeSecret
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_SECRET
    } else {
      process.env.AUTH_SECRET = originalSecret
    }
    setNodeEnv(originalNodeEnv)
  })

  it('encodes and decodes a round-trip payload with a valid signature', () => {
    const payload: SessionPayload = {
      userId: 'u_123',
      organizationId: 'o_456',
      context: 'production',
      timestamp: 1_700_000_000_000,
    }
    const token = encodeSession(payload)
    // Signed format: <base64url>.<hmac-base64url>
    const parts = token.split('.')
    expect(parts).toHaveLength(2)
    expect(decodeSession(token)).toEqual(payload)
  })

  it('rejects a token whose signature was tampered with', () => {
    const payload: SessionPayload = {
      userId: 'u_123',
      organizationId: 'o_456',
      context: 'production',
      timestamp: Date.now(),
    }
    const token = encodeSession(payload)
    // Flip a character in the signature portion.
    const tampered = token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a')
    expect(decodeSession(tampered)).toBeNull()
  })

  it('rejects a token forged with a different secret', () => {
    const payload: SessionPayload = {
      userId: 'u_123',
      organizationId: 'o_456',
      context: 'production',
      timestamp: Date.now(),
    }
    const token = encodeSession(payload)
    process.env.AUTH_SECRET = 'different-secret-different-secret-!!'
    expect(decodeSession(token)).toBeNull()
    process.env.AUTH_SECRET = fakeSecret
  })

  it('returns null for malformed tokens (no dot separator)', () => {
    expect(decodeSession('not-a-valid-token')).toBeNull()
    expect(decodeSession('')).toBeNull()
    expect(decodeSession('abc.def.ghi')).toBeNull()
  })

  it('returns null for payloads missing required fields', () => {
    expect(decodeSession('eyJ1c2VySWQiOiJ1In0.abc')).toBeNull()
  })

  it('reports a fresh session as not expired', () => {
    const payload: SessionPayload = { userId: 'u', organizationId: 'o', context: 'production', timestamp: Date.now() }
    expect(isSessionExpired(payload)).toBe(false)
  })

  it('reports an old session as expired', () => {
    const payload: SessionPayload = {
      userId: 'u',
      organizationId: 'o',
      context: 'production',
      timestamp: Date.now() - SESSION_MAX_AGE_MS - 1000,
    }
    expect(isSessionExpired(payload)).toBe(true)
  })

  it('honours a custom max age', () => {
    const payload: SessionPayload = {
      userId: 'u',
      organizationId: 'o',
      context: 'production',
      timestamp: Date.now() - 5000,
    }
    expect(isSessionExpired(payload, 1000)).toBe(true)
    expect(isSessionExpired(payload, 10000)).toBe(false)
  })

  it('throws when AUTH_SECRET is missing in non-production', () => {
    const saved = process.env.AUTH_SECRET
    delete process.env.AUTH_SECRET
    setNodeEnv('development')
    expect(() => getSessionSecret()).toThrow('AUTH_SECRET is not defined')
    if (saved) {
      process.env.AUTH_SECRET = saved
    } else {
      delete process.env.AUTH_SECRET
    }
    setNodeEnv(undefined)
  })
})