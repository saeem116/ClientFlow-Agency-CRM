import Link from "next/link"
import { Building2, GitBranch } from "lucide-react"

export function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">ClientFlow</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Agency CRM that unifies clients, projects, tasks, invoices, and business insights in one workspace.
            </p>
            <div className="flex gap-4 pt-2">
              <a
                href="https://github.com/saeem116/ClientFlow-Agency-CRM"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <GitBranch className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <nav className="space-y-2">
              <Link href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#benefits" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Benefits
              </Link>
              <Link href="#preview" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Product Preview
              </Link>
              <Link href="/sign-in?demo=1" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Live Demo
              </Link>
              <Link href="/sign-in" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <nav className="space-y-2">
              <Link href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link href="#who-it-for" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Who It&apos;s For
              </Link>
              <Link href="#security" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Security
              </Link>
              <Link href="#faq" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <nav className="space-y-2">
              <span className="block text-sm text-muted-foreground/60">Privacy Policy</span>
              <span className="block text-sm text-muted-foreground/60">Terms of Service</span>
            </nav>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/70">
            &copy; {currentYear} ClientFlow. All rights reserved.{""}
          </p>
          <p className="text-xs text-muted-foreground/60">
            Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and MongoDB.
          </p>
        </div>
      </div>
    </footer>
  )
}