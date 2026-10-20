import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompactCurrency(amount: number) {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`
  }
  return `$${amount.toFixed(0)}`
}

export function formatDate(date: Date | string | null) {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

export function formatDateTime(date: Date | string | null) {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

export function formatRelativeTime(date: Date | string | null) {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Resolve a display name for a user from their database record.
 *
 * Order of preference:
 *   1. The user's `name` field (set during sign-up or profile editing).
 *   2. The local part of their `email` (e.g. "john.doe" from "john.doe@example.com").
 *   3. The literal fallback "User", used only when no identity information exists.
 *
 * This keeps the header meaningful even for legacy accounts whose `name` was
 * never populated, while never fabricating identity data.
 */
export function resolveDisplayName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  if (!user) return "User"
  const name = user.name?.trim()
  if (name) return name
  const email = user.email?.trim()
  if (email && email.includes("@")) {
    const localPart = email.split("@")[0]
    if (localPart) {
      // Replace separators with spaces and title-case, e.g. "john.doe" -> "John Doe".
      return localPart
        .replace(/[._-]+/g, " ")
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    }
  }
  return "User"
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function cnDate(date: Date | string | null | undefined) {
  if (!date) return null
  return typeof date === "string" ? date : date.toISOString()
}

export function isOverdue(date: Date | string | null | undefined) {
  if (!date) return false
  const d = typeof date === "string" ? new Date(date) : date
  return d < new Date(new Date().setHours(0, 0, 0, 0))
}

export function daysUntil(date: Date | string | null | undefined) {
  if (!date) return null
  const d = typeof date === "string" ? new Date(date) : date
  const today = new Date(new Date().setHours(0, 0, 0, 0))
  const target = new Date(d.setHours(0, 0, 0, 0))
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}