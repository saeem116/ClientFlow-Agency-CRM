"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Building2 } from "lucide-react"

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#preview", label: "Product Preview" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
]

/** Smooth-scroll to an anchor on the current page. Falls back to default navigation. */
function smoothScrollTo(hash: string, onClick?: () => void) {
  // If the link points to another page, let normal navigation happen
  if (hash.startsWith("http") || hash.includes("//")) {
    return
  }
  const id = hash.replace(/^#/, "")
  const target = document.getElementById(id)
  if (!target) return
  onClick?.()
  target.scrollIntoView({ behavior: "smooth", block: "start" })
  // Remove focus outline so the browser doesn't leave a visible ring on the hidden element
  requestAnimationFrame(() => target.blur())
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-lg border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              ClientFlow
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  smoothScrollTo(link.href)
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted">
              Sign in
            </Link>
            <Link href="/sign-in?demo=1" className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2">
              Live Demo
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
          <nav className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  smoothScrollTo(link.href, () => setMobileOpen(false))
                }}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 mt-3 border-t border-border space-y-2">
              <Link href="/sign-in" className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-lg hover:bg-muted" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link href="/sign-in?demo=1" className="block w-full text-center inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2.5" onClick={() => setMobileOpen(false)}>
                Live Demo
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}