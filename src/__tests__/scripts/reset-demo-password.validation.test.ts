import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseDatabaseName,
  validateMongoScheme,
  extractHost,
  isLocalhostHost,
  isRemoteHost,
  TARGET_EMAIL,
  validateTargetEmail,
  ALLOWED_RESET_DB_HOSTS,
} from '@/lib/reset-demo-password.utils'

// Helper to set/clear env vars safely.
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

describe('reset-demo-password validation helpers', () => {
  const originalDemoAccountEmail = process.env.DEMO_ACCOUNT_EMAIL

  beforeEach(() => {
    delete process.env.DEMO_ACCOUNT_EMAIL
  })

  afterEach(() => {
    setEnv('DEMO_ACCOUNT_EMAIL', originalDemoAccountEmail)
  })

  describe('parseDatabaseName', () => {
    it('extracts the db name from a standard URI', () => {
      expect(parseDatabaseName('mongodb://host/foo')).toBe('foo')
    })

    it('extracts the db name from a mongodb+srv URI', () => {
      expect(parseDatabaseName('mongodb+srv://user:pass@abc.def/clientflow_demo')).toBe('clientflow_demo')
    })

    it('returns null for a bare scheme without a path', () => {
      expect(parseDatabaseName('mongodb://')).toBeNull()
    })

    it('handles query parameters in the URI', () => {
      expect(parseDatabaseName('mongodb://host:27017/mydb?retryWrites=true')).toBe('mydb')
    })
  })

  describe('validateMongoScheme', () => {
    it('accepts mongodb://', () => {
      expect(validateMongoScheme('mongodb://host/db')).toBe(true)
    })

    it('accepts mongodb+srv://', () => {
      expect(validateMongoScheme('mongodb+srv://host/db')).toBe(true)
    })

    it('rejects unsupported schemes', () => {
      expect(validateMongoScheme('http://host/db')).toBe(false)
      expect(validateMongoScheme('redis://host/db')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(validateMongoScheme('')).toBe(false)
    })
  })

  describe('extractHost', () => {
    it('extracts host from mongodb+srv URI', () => {
      expect(extractHost('mongodb+srv://u:p@cluster0.abc.mongodb.net/db')).toBe('cluster0.abc.mongodb.net')
    })

    it('extracts host with port', () => {
      expect(extractHost('mongodb://user:pass@localhost:27017/db')).toBe('localhost')
    })

    it('returns null for URIs without @ authority', () => {
      expect(extractHost('mongodb://localhost:27017/db')).toBeNull()
    })
  })

  describe('isLocalhostHost / isRemoteHost', () => {
    it('accepts localhost', () => {
      expect(isLocalhostHost('mongodb://localhost:27017/db')).toBe(true)
      expect(isRemoteHost('mongodb://localhost:27017/db')).toBe(false)
    })

    it('accepts 127.0.0.1', () => {
      expect(isLocalhostHost('mongodb://127.0.0.1:27017/db')).toBe(true)
      expect(isRemoteHost('mongodb://127.0.0.1:27017/db')).toBe(false)
    })

    it('accepts ::1', () => {
      expect(isLocalhostHost('mongodb://[::1]:27017/db')).toBe(true)
      expect(isRemoteHost('mongodb://[::1]:27017/db')).toBe(false)
    })

    it('rejects Atlas hostnames', () => {
      expect(isLocalhostHost('mongodb+srv://u:p@cluster0.lgub4dr.mongodb.net/db')).toBe(false)
      expect(isRemoteHost('mongodb+srv://u:p@cluster0.lgub4dr.mongodb.net/db')).toBe(true)
    })

    it('rejects unknown remote hosts', () => {
      expect(isLocalhostHost('mongodb://my-remote-host:27017/db')).toBe(false)
      expect(isRemoteHost('mongodb://my-remote-host:27017/db')).toBe(true)
    })
  })

  describe('validateTargetEmail', () => {
    it('returns ok when DEMO_ACCOUNT_EMAIL is unset', () => {
      expect(validateTargetEmail()).toEqual({ ok: true })
    })

    it('returns ok when DEMO_ACCOUNT_EMAIL matches the target', () => {
      setEnv('DEMO_ACCOUNT_EMAIL', TARGET_EMAIL)
      expect(validateTargetEmail()).toEqual({ ok: true })
    })

    it('returns error when DEMO_ACCOUNT_EMAIL differs from target', () => {
      setEnv('DEMO_ACCOUNT_EMAIL', 'other@example.com')
      const result = validateTargetEmail()
      expect(result.ok).toBe(false)
      expect(result.error).toContain('other@example.com')
      expect(result.error).toContain(TARGET_EMAIL)
    })
  })
})

describe('TARGET_EMAIL constant', () => {
  it('is exactly reviewer@clientflow.test', () => {
    expect(TARGET_EMAIL).toBe('reviewer@clientflow.test')
  })
})
