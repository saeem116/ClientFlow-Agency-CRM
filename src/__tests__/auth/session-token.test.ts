import { describe, it, expect } from 'vitest'
import {
  encodeSession,
  decodeSession,
  isSessionExpired,
  SESSION_MAX_AGE_MS,
  type SessionPayload,
} from '@/lib/session-token'

describe('session-token', () => {
  it('encodes and decodes a round-trip payload', () => {
    const payload: SessionPayload = {
      userId: 'u_123',
      organizationId: 'o_456',
      timestamp: 1_700_000_000_000,
    }
    const token = encodeSession(payload)
    // base64url: no padding, uses - and _ instead of + and /
    expect(token).not.toContain('+')
    expect(token).not.toContain('/')
    expect(token).not.toContain('=')
    expect(decodeSession(token)).toEqual(payload)
  })

  it('decodes standard base64 input (with padding) too', () => {
    const payload: SessionPayload = {
      userId: 'u_abc',
      organizationId: 'o_def',
      timestamp: 1,
    }
    const token = Buffer.from(JSON.stringify(payload)).toString('base64')
    expect(decodeSession(token)).toEqual(payload)
  })

  it('returns null for malformed tokens', () => {
    expect(decodeSession('!!!not base64!!!')).toBeNull()
    expect(decodeSession('')).toBeNull()
    expect(decodeSession('eyJhbGciOiJIUzI1NiJ9')).toBeNull() // valid base64, not a payload
  })

  it('returns null for payloads missing required fields', () => {
    const bad = Buffer.from(JSON.stringify({ userId: 'u' })).toString('base64url')
    expect(decodeSession(bad)).toBeNull()
    const bad2 = Buffer.from(JSON.stringify({ organizationId: 'o' })).toString('base64url')
    expect(decodeSession(bad2)).toBeNull()
  })

  it('reports a fresh session as not expired', () => {
    const payload: SessionPayload = { userId: 'u', organizationId: 'o', timestamp: Date.now() }
    expect(isSessionExpired(payload)).toBe(false)
  })

  it('reports an old session as expired', () => {
    const payload: SessionPayload = {
      userId: 'u',
      organizationId: 'o',
      timestamp: Date.now() - SESSION_MAX_AGE_MS - 1000,
    }
    expect(isSessionExpired(payload)).toBe(true)
  })

  it('honours a custom max age', () => {
    const payload: SessionPayload = {
      userId: 'u',
      organizationId: 'o',
      timestamp: Date.now() - 5000,
    }
    expect(isSessionExpired(payload, 1000)).toBe(true)
    expect(isSessionExpired(payload, 10000)).toBe(false)
  })
})