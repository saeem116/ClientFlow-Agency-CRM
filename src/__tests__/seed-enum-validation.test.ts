import { describe, it, expect } from 'vitest'
import type mongoose from 'mongoose'
import { Payment, Invoice, Lead, Project, Task, Client, User } from '@/lib/mongoose'

/**
 * Extract the enum values declared on a Mongoose schema path.
 * Returns null when the path has no enum (e.g. plain String/Number).
 */
function getEnumValues(schema: mongoose.Schema, path: string): string[] | null {
  const def = schema.path(path)
  if (!def) return null
  const enumValues = (def as unknown as { enumValues?: string[] }).enumValues
  if (!enumValues || enumValues.length === 0) return null
  return enumValues
}

/**
 * Demo seed data — the exact values used in scripts/seed-demo-public.js.
 * These must match the enum values declared on the corresponding Mongoose schemas.
 */
const SEED_DATA = {
  payment: {
    method: 'BANK_TRANSFER',
  },
  invoice: {
    status: 'PAID',
  },
  lead: {
    stage: 'NEW',
    source: 'WEBSITE',
  },
  project: {
    status: 'ACTIVE',
    priority: 'HIGH',
  },
  task: {
    status: 'DONE',
    priority: 'HIGH',
  },
  client: {
    status: 'active',
  },
  user: {
    role: 'MEMBER',
  },
}

describe('seed-demo-public.js enum validation', () => {
  it('Payment.method matches the Payment schema enum', () => {
    const values = getEnumValues(Payment.schema, 'method')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.payment.method)
  })

  it('Invoice.status matches the Invoice schema enum', () => {
    const values = getEnumValues(Invoice.schema, 'status')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.invoice.status)
  })

  it('Lead.stage matches the Lead schema enum', () => {
    const values = getEnumValues(Lead.schema, 'stage')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.lead.stage)
  })

  it('Lead.source matches the Lead schema enum', () => {
    const values = getEnumValues(Lead.schema, 'source')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.lead.source)
  })

  it('Project.status matches the Project schema enum', () => {
    const values = getEnumValues(Project.schema, 'status')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.project.status)
  })

  it('Project.priority matches the Project schema enum', () => {
    const values = getEnumValues(Project.schema, 'priority')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.project.priority)
  })

  it('Task.status matches the Task schema enum', () => {
    const values = getEnumValues(Task.schema, 'status')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.task.status)
  })

  it('Task.priority matches the Task schema enum', () => {
    const values = getEnumValues(Task.schema, 'priority')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.task.priority)
  })

  it('Client.status matches the Client schema enum', () => {
    const values = getEnumValues(Client.schema, 'status')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.client.status)
  })

  it('User.role matches the User schema enum', () => {
    const values = getEnumValues(User.schema, 'role')
    expect(values).not.toBeNull()
    expect(values).toContain(SEED_DATA.user.role)
  })
})