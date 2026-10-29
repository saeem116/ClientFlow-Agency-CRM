// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from '@/app/profile/profile-page'
import { AuthProvider, useAuth, type AuthContextType } from '@/lib/auth-context'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}))

const normalUser = {
  id: 'u_1',
  email: 'alice@example.com',
  name: 'Alice Smith',
  avatar: null,
  role: 'MEMBER',
  organizationRole: 'ADMIN',
  phone: '+1 (555) 123-4567',
  organizationId: 'o_1',
}

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

const orgShape = { id: 'o_1', name: 'Acme', slug: 'acme' }

function Harness({ onAuth }: { onAuth: (a: AuthContextType) => void }) {
  const auth = useAuth()
  onAuth(auth)
  return null
}

describe('Profile Page — navigation', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: normalUser, org: orgShape, isDemo: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('displays the My Profile heading', async () => {
    render(
      <AuthProvider initialUser={normalUser} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={normalUser} org={orgShape} isDemo={false} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument()
    })
  })

  it('shows a back link to /settings', async () => {
    render(
      <AuthProvider initialUser={normalUser} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={normalUser} org={orgShape} isDemo={false} />
      </AuthProvider>
    )

    const link = screen.getByRole('link', { name: /back to settings/i })
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('renders Personal Information card with editable fields', async () => {
    render(
      <AuthProvider initialUser={normalUser} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={normalUser} org={orgShape} isDemo={false} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveValue(normalUser.name)
      expect(screen.getByRole('textbox', { name: /phone number/i })).toHaveValue(normalUser.phone)
    })
  })

  it('renders Change Password section', async () => {
    render(
      <AuthProvider initialUser={normalUser} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={normalUser} org={orgShape} isDemo={false} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
    })
  })

  it('shows demo account banner for demo users', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: demoUser, org: orgShape, isDemo: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <AuthProvider initialUser={demoUser} initialOrg={orgShape} initialIsDemo={true}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={demoUser} org={orgShape} isDemo={true} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/demo account/i)).toBeInTheDocument()
    })
  })

  it('disables save button for demo users', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: demoUser, org: orgShape, isDemo: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <AuthProvider initialUser={demoUser} initialOrg={orgShape} initialIsDemo={true}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={demoUser} org={orgShape} isDemo={true} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled()
    })
  })
})

describe('Profile Page — edit name', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: normalUser, org: orgShape, isDemo: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('sends PATCH request when Save Changes is clicked', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({
        user: { ...normalUser, name: 'Alice Updated' },
        org: orgShape,
        isDemo: false,
      }), { status: 200 })
    )

    render(
      <AuthProvider initialUser={normalUser} initialOrg={orgShape} initialIsDemo={false}>
        <Harness onAuth={() => {}} />
        <ProfilePage user={normalUser} org={orgShape} isDemo={false} />
      </AuthProvider>
    )

    const nameInput = screen.getByRole('textbox', { name: /full name/i })
    await act(async () => {
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Alice Updated')
    })

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await act(async () => {
      await userEvent.click(saveBtn)
    })

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/auth/profile',
        expect.objectContaining({ method: 'PATCH' })
      )
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as any).body as string)
      expect(body.name).toBe('Alice Updated')
    })
  })
})