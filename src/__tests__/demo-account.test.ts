import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isDemoAccount,
  getDemoAccountEmail,
  requireNotDemoAccount,
  DemoAccountReadOnlyError,
  DEFAULT_DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_EMAIL_ENV,
} from '@/lib/demo-account'

// Helper to set NODE_ENV (typed as read-only in TypeScript lib.dom.d.ts).
function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

describe('demo-account guard', () => {
  const originalDemoEmail = process.env[DEMO_ACCOUNT_EMAIL_ENV]
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env[DEMO_ACCOUNT_EMAIL_ENV] = DEFAULT_DEMO_ACCOUNT_EMAIL
  })

  afterEach(() => {
    if (originalDemoEmail === undefined) {
      delete process.env[DEMO_ACCOUNT_EMAIL_ENV]
    } else {
      process.env[DEMO_ACCOUNT_EMAIL_ENV] = originalDemoEmail
    }
    setNodeEnv(originalNodeEnv)
  })

  it('returns the configured demo email', () => {
    expect(getDemoAccountEmail()).toBe(DEFAULT_DEMO_ACCOUNT_EMAIL)
  })

  it('returns null when the env var is not set', () => {
    delete process.env[DEMO_ACCOUNT_EMAIL_ENV]
    expect(getDemoAccountEmail()).toBeNull()
  })

  it('returns null when the env var is an empty string', () => {
    process.env[DEMO_ACCOUNT_EMAIL_ENV] = ''
    expect(getDemoAccountEmail()).toBeNull()
  })

  it('returns null when NODE_ENV is production and the env var is not set', () => {
    delete process.env[DEMO_ACCOUNT_EMAIL_ENV]
    setNodeEnv('production')
    expect(getDemoAccountEmail()).toBeNull()
  })

  it('normalizes email comparison (lowercase, trimmed)', () => {
    expect(isDemoAccount('ReviewEr@ClientFlow.Test')).toBe(true)
    expect(isDemoAccount('  reviewer@clientflow.test  ')).toBe(true)
  })

  it('returns false for non-matching emails', () => {
    expect(isDemoAccount('admin@demo.com')).toBe(false)
    expect(isDemoAccount('other@test.org')).toBe(false)
  })

  it('returns false for null/undefined email', () => {
    expect(isDemoAccount(null)).toBe(false)
    expect(isDemoAccount(undefined)).toBe(false)
  })

  it('throws DemoAccountReadOnlyError for the demo account', () => {
    expect(() => requireNotDemoAccount(DEFAULT_DEMO_ACCOUNT_EMAIL))
      .toThrow(DemoAccountReadOnlyError)
  })

  it('does not throw for non-demo accounts', () => {
    expect(() => requireNotDemoAccount('admin@demo.com')).not.toThrow()
    expect(() => requireNotDemoAccount('member@test.org')).not.toThrow()
  })

  it('throws with a generic message that does not reveal demo account info', () => {
    try {
      requireNotDemoAccount(DEFAULT_DEMO_ACCOUNT_EMAIL)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(DemoAccountReadOnlyError)
      expect((err as Error).message).not.toContain(DEFAULT_DEMO_ACCOUNT_EMAIL)
      expect((err as Error).message).not.toContain('reviewer')
    }
  })
})
