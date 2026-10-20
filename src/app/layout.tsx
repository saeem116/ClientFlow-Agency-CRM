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
  const session = await getSession()
  const org = session ? await getOrganization() : null

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