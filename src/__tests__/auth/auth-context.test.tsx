// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useAuth, AuthProvider, type AuthContextType } from '@/lib/auth-context'

const userShape = {
  id: 'u_1',
  email: 'a@example.com',
  name: 'Alice',
  avatar: null,
  role: 'ADMIN',
  organizationId: 'o_1',
}

const orgShape = { id: 'o_1', name: 'Acme', slug: 'acme' }

function Harness({ onAuth }: { onAuth: (a: AuthContextType) => void }) {
  const auth = useAuth()
  onAuth(auth)
  return <div data-testid="shell">{auth.user ? 'shell' : 'no-shell'}</div>
}

describe('auth-context', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('seeds user from server-rendered initialUser and does not refresh', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: userShape, org: orgShape }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    let captured: AuthContextType | null = null
    render(
      <AuthProvider initialUser={userShape} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={(a) => (captured = a)} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toEqual(userShape)
      expect(captured?.org).toEqual(orgShape)
      expect(captured?.loading).toBe(false)
    })
    // Server already provided a user, so no refresh request should fire.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders no shell when user is null initially', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: null, org: null }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <Harness onAuth={() => {}} />
      </AuthProvider>
    )

    expect(screen.getByTestId('shell').textContent).toBe('no-shell')
  })

  it('refreshes from the server after mount when no initial user is provided', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: userShape, org: orgShape }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    let captured: AuthContextType | null = null
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <Harness onAuth={(a) => (captured = a)} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toEqual(userShape)
      expect(captured?.org).toEqual(orgShape)
    })
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/me', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
  })

  it('clears state when the server returns 401', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: null, org: null }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    let captured: AuthContextType | null = null
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <Harness onAuth={(a) => (captured = a)} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(captured?.user).toBeNull()
      expect(captured?.loading).toBe(false)
    })
  })

  it('refresh() re-validates on demand', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: null, org: null }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: userShape, org: orgShape }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    let captured: AuthContextType | null = null
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <Harness
          onAuth={(a) => {
            captured = a
          }}
        />
      </AuthProvider>
    )

    await waitFor(() => expect(captured?.loading).toBe(false))

    await act(async () => {
      await captured!.refresh()
    })

    await waitFor(() => {
      expect(captured?.user).toEqual(userShape)
      expect(captured?.org).toEqual(orgShape)
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('setUser and setOrg update state optimistically', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: null, org: null }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    let captured: AuthContextType = null as any
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <Harness
          onAuth={(a) => {
            captured = a
          }}
        />
      </AuthProvider>
    )

    await waitFor(() => expect(captured.loading).toBe(false))

    act(() => {
      captured.setUser(userShape)
      captured.setOrg(orgShape)
    })

    expect(captured.user).toEqual(userShape)
    expect(captured.org).toEqual(orgShape)
  })
})