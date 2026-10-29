/**
 * Regression tests for the removed fallback secret.
 *
 * Previously, getSessionSecret() returned "dev-secret-change-in-production"
 * when AUTH_SECRET was absent in non-production environments. This allowed
 * anyone to forge valid session tokens locally.
 *
 * After the fix, both getSessionSecret() and requireAuthSecret() throw
 * immediately when AUTH_SECRET is missing — in any NODE_ENV.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

describe('Fallback secret removal', () => {
  const originalSecret = process.env.AUTH_SECRET
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Remove the secret so tests that expect failure have a clean state.
    delete process.env.AUTH_SECRET
  })

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_SECRET
    } else {
      process.env.AUTH_SECRET = originalSecret
    }
    setNodeEnv(originalNodeEnv)
  })

  it('throws in development when AUTH_SECRET is missing (no fallback)', () => {
    setNodeEnv('development')
    expect(() => getSessionSecret()).toThrow('AUTH_SECRET is not defined')
  })

  it('throws in production when AUTH_SECRET is missing', () => {
    setNodeEnv('production')
    expect(() => getSessionSecret()).toThrow('AUTH_SECRET is not defined')
  })

  it('does not silently return a fallback string', () => {
    setNodeEnv('development')
    // Before the fix this would have returned "dev-secret-change-in-production".
    // After the fix it must throw.
    expect(() => getSessionSecret()).not.toThrow('dev-secret-change-in-production')
    expect(() => getSessionSecret()).toThrow()
  })

  it('still works with a valid AUTH_SECRET in development', () => {
    setNodeEnv('development')
    process.env.AUTH_SECRET = 'x'.repeat(64)
    expect(() => getSessionSecret()).not.toThrow()
    expect(getSessionSecret()).toBe('x'.repeat(64))
  })
})
