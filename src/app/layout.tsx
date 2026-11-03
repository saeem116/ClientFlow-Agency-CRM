import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { LayoutWrapper } from "./layout-wrapper"
import { getSession, getOrganization } from "@/lib/auth"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClientFlow — Agency CRM",
  description: "Premium CRM for freelance developers and small agencies",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // On cold-started Vercel serverless functions, the MongoDB connection may
  // not be ready when this layout renders. If getSession()/getOrganization()
  // fail, fall back to a null session rather than throwing a 500 — the
  // client-side AuthProvider will re-validate on mount and the dashboard
  // page will redirect to /sign-in if needed. This is a safety net for the
  // retry logic in ensureDb(); both layers must fail before a cold-start
  // request can surface as a 500.
  let session: Awaited<ReturnType<typeof getSession>> = null
  let org: Awaited<ReturnType<typeof getOrganization>> = null
  try {
    session = await getSession()
    org = session ? await getOrganization() : null
  } catch (error) {
    console.error('[RootLayout] Session resolution failed:', error instanceof Error ? error.message : String(error))
  }

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <LayoutWrapper session={session} org={org}>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}