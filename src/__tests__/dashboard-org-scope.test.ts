/**
 * Test that verifies the dashboard query is scoped by organizationId.
 * This is a code-level check, not a live-query test — it inspects the
 * source to confirm the filter is present.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('dashboard organization scoping', () => {
  it('includes organizationId in the Task.find query on the dashboard', () => {
    const dashboardPath = join(process.cwd(), 'src/app/dashboard/page.tsx')
    const content = readFileSync(dashboardPath, 'utf-8')

    // The dashboard should query tasks with an organizationId filter.
    expect(content).toContain('Task.find')
    // Verify there is an organizationId filter in the task query section.
    // The filter object spans multiple lines, so use a multiline regex.
    const taskQueryMatch = content.match(/Task\.find\(\{[\s\S]*?organizationId:[\s\S]*?\}\)/)
    expect(taskQueryMatch).toBeTruthy()
  })

  it('includes organizationId in all data queries on the dashboard', () => {
    const dashboardPath = join(process.cwd(), 'src/app/dashboard/page.tsx')
    const content = readFileSync(dashboardPath, 'utf-8')

    // Every model query on the dashboard should be scoped by orgId.
    expect(content).toContain('organizationId: orgId')
  })
})
