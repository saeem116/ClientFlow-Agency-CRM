// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadCard } from '@/app/leads/leads-card'
import { LeadsPageClient } from '@/app/leads/leads-page-client'
import { AuthProvider, useAuth, type AuthContextType } from '@/lib/auth-context'

// LeadCard uses useRouter() from next/navigation, which requires the App
// Router to be mounted. Mock it so the component can render in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}))

const demoUser = {
  id: 'u_demo',
  email: 'reviewer@clientflow.test',
  name: 'Demo Reviewer',
  avatar: null,
  role: 'MEMBER',
  organizationRole: 'MEMBER',
  phone: null,
  organizationId: 'o_demo',
}

const normalUser = {
  id: 'u_1',
  email: 'alice@example.com',
  name: 'Alice',
  avatar: null,
  role: 'MEMBER',
  organizationRole: 'MEMBER',
  phone: null,
  organizationId: 'o_1',
}

const orgShape = { id: 'o_1', name: 'Acme', slug: 'acme' }

function Harness({ onAuth }: { onAuth: (a: AuthContextType) => void }) {
  const auth = useAuth()
  onAuth(auth)
  return null
}

describe('LeadCard — authorized user', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('shows View Details, Edit, and Delete actions', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: normalUser, org: orgShape, isDemo: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    let captured: AuthContextType | null = null
    render(
      <AuthProvider initialUser={normalUser} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={(a) => (captured = a)} />
        <LeadCard
          lead={{
            id: 'l_1',
            title: 'Test Lead',
            email: 'test@example.com',
            stage: 'NEW',
            value: 1000,
            source: 'WEBSITE',
            followUpAt: null,
            client: null,
          }}
        />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toEqual(normalUser)
      expect(captured?.isDemo).toBe(false)
    })

    // The action menu trigger is hidden until hover/focus, so we check the
    // dropdown content is reachable by clicking the trigger.
    const trigger = screen.getByRole('button', { name: /lead actions/i })
    await act(async () => {
      await userEvent.click(trigger)
    })

    expect(screen.getByRole('menuitem', { name: /view details/i })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: /^edit$/i })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: /^delete$/i })).not.toBeNull()
  })
})

describe('LeadCard — demo (read-only) user', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('shows only View Details and hides Edit/Delete', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: demoUser, org: orgShape, isDemo: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    let captured: AuthContextType | null = null
    render(
      <AuthProvider initialUser={demoUser} initialOrg={orgShape} initialIsDemo={true}>
        <Harness onAuth={(a) => (captured = a)} />
        <LeadCard
          lead={{
            id: 'l_1',
            title: 'Demo Lead',
            email: 'demo@example.com',
            stage: 'NEW',
            value: 1000,
            source: 'WEBSITE',
            followUpAt: null,
            client: null,
          }}
        />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toEqual(demoUser)
      expect(captured?.isDemo).toBe(true)
    })

    const trigger = screen.getByRole('button', { name: /lead actions/i })
    await act(async () => {
      await userEvent.click(trigger)
    })

    expect(screen.getByRole('menuitem', { name: /view details/i })).not.toBeNull()
    expect(screen.queryByRole('menuitem', { name: /^edit$/i })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /^delete$/i })).toBeNull()
  })
})

describe('LeadsPageClient — demo gating', () => {
  it('hides the New Lead button for demo users', () => {
    render(
      <LeadsPageClient
        leads={[]}
        isDemo={true}
      />
    )

    expect(screen.queryByRole('link', { name: /new lead/i })).toBeNull()
  })

  it('shows the New Lead button for authorized users', () => {
    render(
      <LeadsPageClient
        leads={[]}
        isDemo={false}
      />
    )

    expect(screen.getByRole('link', { name: /new lead/i })).not.toBeNull()
  })
})