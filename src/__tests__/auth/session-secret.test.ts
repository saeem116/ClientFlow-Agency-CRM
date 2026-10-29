/**
 * Tests for the shared AUTH_SECRET helper (src/lib/session-secret.ts).
 *
 * Covers:
 *  - Missing AUTH_SECRET throws in both production and development.
 *  - Too-short AUTH_SECRET is rejected.
 *  - Valid AUTH_SECRET passes through unchanged.
 *  - getSessionSecret() delegates to requireAuthSecret().
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requireAuthSecret, getAuthSecret, MIN_SECRET_LENGTH } from '@/lib/session-secret'
import { getSessionSecret } from '@/lib/session-token'

// Helper to set NODE_ENV (typed as read-only in TypeScript lib.dom.d.ts).
function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

describe('session-secret', () => {
  const originalSecret = process.env.AUTH_SECRET
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Start each test with a known-good secret so requireAuthSecret succeeds
    // by default, and tests that expect failure can explicitly delete it.
    process.env.AUTH_SECRET = 'a'.repeat(MIN_SECRET_LENGTH)
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_SECRET
    } else {
      process.env.AUTH_SECRET = originalSecret
    }
    setNodeEnv(originalNodeEnv)
  })

  // ── getAuthSecret ──────────────────────────────────────────────────────────
  describe('getAuthSecret', () => {
    it('returns null when AUTH_SECRET is unset', () => {
      delete process.env.AUTH_SECRET
      expect(getAuthSecret()).toBeNull()
    })

    it('returns null when AUTH_SECRET is an empty string', () => {
      process.env.AUTH_SECRET = ''
      expect(getAuthSecret()).toBeNull()
    })

    it('returns the configured secret when valid', () => {
      process.env.AUTH_SECRET = 'my-valid-secret-64-chars-long-abcdefghij'
      expect(getAuthSecret()).toBe('my-valid-secret-64-chars-long-abcdefghij')
    })
  })

  // ── requireAuthSecret ──────────────────────────────────────────────────────
  describe('requireAuthSecret', () => {
    it('throws when AUTH_SECRET is missing in production', () => {
      delete process.env.AUTH_SECRET
      setNodeEnv('production')
      expect(() => requireAuthSecret()).toThrow('AUTH_SECRET is not defined')
    })

    it('throws when AUTH_SECRET is missing in development', () => {
      delete process.env.AUTH_SECRET
      setNodeEnv('development')
      expect(() => requireAuthSecret()).toThrow('AUTH_SECRET is not defined')
    })

    it('throws when AUTH_SECRET is too short (below MIN_SECRET_LENGTH)', () => {
      process.env.AUTH_SECRET = 'short'
      expect(() => requireAuthSecret()).toThrow('too short')
    })

    it('returns the secret when it meets the minimum length', () => {
      const secret = 'a'.repeat(MIN_SECRET_LENGTH)
      process.env.AUTH_SECRET = secret
      expect(requireAuthSecret()).toBe(secret)
    })

    it('rejects the placeholder value "dev-secret-change-in-production"', () => {
      process.env.AUTH_SECRET = 'dev-secret-change-in-production'
      expect(() => requireAuthSecret()).toThrow()
    })
  })

  // ── getSessionSecret (session-token.ts) ────────────────────────────────────
  describe('getSessionSecret', () => {
    it('delegates to requireAuthSecret and throws when missing', () => {
      delete process.env.AUTH_SECRET
      setNodeEnv('development')
      expect(() => getSessionSecret()).toThrow('AUTH_SECRET is not defined')
    })

    it('returns the configured secret when present and valid', () => {
      const secret = 'b'.repeat(MIN_SECRET_LENGTH)
      process.env.AUTH_SECRET = secret
      expect(getSessionSecret()).toBe(secret)
    })
  })
})
