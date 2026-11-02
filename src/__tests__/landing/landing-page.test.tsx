import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingPage } from '@/components/landing/landing-page'

// Mock next/link and next/image
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}))

// Mock theme provider
vi.mock('@/components/providers/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
    density: 'normal',
    setDensity: vi.fn(),
  }),
}))

describe('LandingPage', () => {
  it('renders hero section with correct copy', () => {
    render(<LandingPage />)

    expect(screen.getByText(/Run your agency\./)).toBeInTheDocument()
    expect(screen.getByText(/Manage every relationship\./)).toBeInTheDocument()
    expect(screen.getByText(/Deliver every project\./)).toBeInTheDocument()
    const demoCtas = screen.getAllByText('Explore Live Demo')
    expect(demoCtas.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Explore Features')).toBeInTheDocument()
  })

  it('renders navigation with correct links', () => {
    render(<LandingPage />)

    // Navigation links appear in both header nav and footer
    const featuresLinks = screen.getAllByText('Features')
    expect(featuresLinks.length).toBeGreaterThanOrEqual(2)

    const benefitsLinks = screen.getAllByText('Benefits')
    expect(benefitsLinks.length).toBeGreaterThanOrEqual(2)

    const previewLinks = screen.getAllByText('Product Preview')
    expect(previewLinks.length).toBeGreaterThanOrEqual(2)

    const howWorksLinks = screen.getAllByText('How It Works')
    expect(howWorksLinks.length).toBeGreaterThanOrEqual(2)

    const faqLinks = screen.getAllByText('FAQ')
    expect(faqLinks.length).toBeGreaterThanOrEqual(2)

    // Sign in and Live Demo appear in nav and footer
    expect(screen.getAllByText(/Sign in/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Live Demo/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders features section', () => {
    render(<LandingPage />)

    expect(screen.getByText('Client Management')).toBeInTheDocument()
    expect(screen.getByText('Lead Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Project Management')).toBeInTheDocument()
    expect(screen.getByText('Task Management')).toBeInTheDocument()
    expect(screen.getByText('Invoice & Payment Management')).toBeInTheDocument()
    expect(screen.getAllByText('Revenue Analytics').length).toBeGreaterThanOrEqual(2)
  })

  it('renders benefits section', () => {
    render(<LandingPage />)

    expect(screen.getByText('Everything your agency needs, without the scattered workflow')).toBeInTheDocument()
    expect(screen.getByText('Keep every client relationship organized')).toBeInTheDocument()
    expect(screen.getByText('Track leads from first contact to conversion')).toBeInTheDocument()
  })

  it('renders FAQ section with correct questions', () => {
    render(<LandingPage />)

    expect(screen.getByText('What is ClientFlow?')).toBeInTheDocument()
    expect(screen.getByText('Can I try the live demo?')).toBeInTheDocument()
    expect(screen.getByText('Does the demo account modify real data?')).toBeInTheDocument()
  })

  it('renders footer with copyright', () => {
    render(<LandingPage />)

    expect(screen.getByText(/ClientFlow. All rights reserved/)).toBeInTheDocument()
  })
})
