import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DemoLoginButtons } from '@/app/sign-in/demo-login-buttons'
import { NavigationLoaderProvider } from '@/components/ui/navigation-loader-context'
import { AuthProvider } from '@/lib/auth-context'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock next/navigation with a proper router mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe('DemoLoginButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: '1', email: 'test@test.com' } }),
    })
  })

  it('renders both demo login buttons', () => {
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <NavigationLoaderProvider>
          <DemoLoginButtons />
        </NavigationLoaderProvider>
      </AuthProvider>
    )

    expect(screen.getByText('Login as Admin')).toBeInTheDocument()
    expect(screen.getByText('Login as Team Member')).toBeInTheDocument()
    expect(screen.getByText('Explore agency-wide dashboards, clients, projects and business operations')).toBeInTheDocument()
    expect(screen.getByText('Explore assigned work, tasks, projects and everyday team workflows')).toBeInTheDocument()
  })

  it('calls demo-login endpoint on admin button click', async () => {
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <NavigationLoaderProvider>
          <DemoLoginButtons />
        </NavigationLoaderProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Login as Admin'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: 'admin' }),
        credentials: 'include',
      })
    })
  })

  it('calls demo-login endpoint on member button click', async () => {
    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <NavigationLoaderProvider>
          <DemoLoginButtons />
        </NavigationLoaderProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Login as Team Member'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: 'member' }),
        credentials: 'include',
      })
    })
  })

  it('shows loading state during login', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <NavigationLoaderProvider>
          <DemoLoginButtons />
        </NavigationLoaderProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Login as Admin'))

    await waitFor(() => {
      expect(screen.getByText('Login as Admin')).toBeInTheDocument()
    })
  })

  it('shows error message on failed login', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Demo database not configured.' }),
    })

    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <NavigationLoaderProvider>
          <DemoLoginButtons />
        </NavigationLoaderProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Login as Admin'))

    await waitFor(() => {
      expect(screen.getByText('Demo database not configured.')).toBeInTheDocument()
    })
  })

  it('disables buttons while loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(
      <AuthProvider initialUser={null} initialOrg={null} initialIsDemo={false}>
        <NavigationLoaderProvider>
          <DemoLoginButtons />
        </NavigationLoaderProvider>
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Login as Admin'))

    await waitFor(() => {
      const adminButton = screen.getByText('Login as Admin').closest('button')
      expect(adminButton).toBeDisabled()
    })
  })
})
