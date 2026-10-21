"use server"

import { ensureDb, User, Membership, Organization } from "./database"
import { headers, cookies } from "next/headers"
import { redirect } from "next/navigation"
import { hashPassword, verifyPassword } from "./bcrypt"
import {
  encodeSession,
  decodeSession,
  isSessionExpired,
  SESSION_MAX_AGE_MS,
  type SessionPayload,
} from "./session-token"
import { requireNotDemoAccount, getDemoAccountEmail } from "./demo-account"
import { connectDemoDb } from "./demo-mongoose"

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  organizationId: string
}

export interface Session {
  user: SessionUser
  /** Whether this session belongs to the shared public demo account. */
  isDemo: boolean
  /** Which database the session was resolved from: "production" or "demo". */
  context: "production" | "demo"
}

/** The shape returned by {@link getOrganization} / {@link requireOrg}. */
export interface OrganizationContext {
  id: string
  name: string
  slug: string
  memberships: never[]
}

const SESSION_COOKIE_NAME = "session"

/**
 * Check if the given email matches the configured admin email.
 */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return false
  return email?.trim().toLowerCase() === adminEmail.trim().toLowerCase()
}

function buildAvatarUrl(avatarId: string | null | undefined, userId: string): string | null {
  if (!avatarId) return null
  if (typeof avatarId === "string" && avatarId.startsWith("http")) return avatarId
  const baseUrl = process.env.NEXT_PUBLIC_AVATAR_BASE_URL || ""
  if (baseUrl) {
    return `${baseUrl}/api/avatars/${userId}`
  }
  return `/api/avatars/${userId}`
}

/**
 * Resolve a session from the current request's cookie.
 *
 * The session token now contains a `context` field ("production" or "demo")
 * that is set at sign-in time and verified on every request. This means:
 *   - A production session ALWAYS uses the production database.
 *   - A demo session ALWAYS uses the demo database.
 *   - There is NO fallback — the context is signed and cannot be forged.
 *
 * Backward compatibility: old tokens without `context` are treated as
 * production sessions (they were all production before this change).
 */
export async function getSession(): Promise<Session | null> {
  await ensureDb()
  const headersList = await headers()
  const cookieHeader = headersList.get("cookie") || ""

  let sessionToken: string | null = null
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      sessionToken = trimmed.substring(`${SESSION_COOKIE_NAME}=`.length)
      break
    }
  }

  if (!sessionToken) return null

  const payload = decodeSession(sessionToken)
  if (!payload || isSessionExpired(payload)) return null

  // Determine context from the signed token (or default to "production" for old tokens)
  const context: "production" | "demo" = payload.context === "demo" ? "demo" : "production"

  if (context === "production") {
    // Production session: look up in production database.
    let user = await User.findById(payload.userId).lean() as unknown as {
      _id: { toString(): string }
      email: string
      name: string | null
      avatar: string | null
      role: string
    } | null

    if (!user) return null

    const membership = await Membership.findOne({
      userId: user._id.toString(),
      organizationId: payload.organizationId,
    }).lean() as unknown as { role: string; userId: { toString(): string }; organizationId: { toString(): string } } | null

    if (!membership) return null

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: buildAvatarUrl(user.avatar, user._id.toString()),
        role: user.role,
        organizationId: payload.organizationId,
      },
      isDemo: false,
      context: "production",
    }
  }

  // Demo session: look up in demo database ONLY. Never touch production.
  const demoMongoose = await connectDemoDb()
  if (!demoMongoose) return null // DEMO_MONGODB_URI not configured

  const { User: DemoUser, Membership: DemoMembership } = await import("./database-demo")
  const UserModel = await DemoUser()
  const MemModel = await DemoMembership()

  const user = await UserModel.findById(payload.userId).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    role: string
  } | null

  if (!user) return null

  const membership = await MemModel.findOne({
    userId: user._id.toString(),
    organizationId: payload.organizationId,
  }).lean() as unknown as { role: string } | null

  if (!membership) return null

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: payload.organizationId,
    },
    isDemo: true,
    context: "demo",
  }
}

export async function createSession(userId: string, organizationId: string, context: "production" | "demo" = "production"): Promise<void> {
  const sessionData: SessionPayload = {
    userId,
    organizationId,
    context,
    timestamp: Date.now(),
  }
  const sessionToken = encodeSession(sessionData)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    path: "/",
  })
}

export async function validateSession(): Promise<{ valid: boolean; user: SessionUser | null; error: string | null }> {
  const session = await getSession()
  if (!session) return { valid: false, user: null, error: "No valid session found" }
  return { valid: true, user: session.user, error: null }
}

export async function getCurrentUser(): Promise<Session | null> {
  return getSession()
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect("/sign-in")
}

export async function getUserByEmail(email: string): Promise<{
  _id: { toString(): string }
  email: string
  name: string | null
  avatar: string | null
  role: string
} | null> {
  await ensureDb()
  return await User.findOne({ email: email.toLowerCase().trim() }).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    role: string
  } | null
}

export async function createUserAndSession(
  email: string,
  role: string,
  organizationId: string
): Promise<{ user: SessionUser | null; error: string | null }> {
  await ensureDb()

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() }).lean() as unknown as {
    _id: { toString(): string }
    email: string
  } | null
  if (existingUser) {
    return { user: null, error: "User with this email already exists" }
  }

  const user = await User.create({
    email: email.toLowerCase().trim(),
    name: null,
    avatar: null,
    role: "MEMBER",
  })

  const personalOrg = await Organization.create({
    name: `${email.split("@")[0]}'s Workspace`,
    slug: `${email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
  })

  await Membership.create({
    userId: user._id,
    organizationId: organizationId,
    role: role as "ADMIN" | "MEMBER" | "CLIENT",
  })

  await Membership.create({
    userId: user._id,
    organizationId: personalOrg._id,
    role: "ADMIN",
  })

  await createSession(user._id.toString(), organizationId, "production")

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: organizationId,
    },
    error: null,
  }
}

export async function requireOrg(): Promise<OrganizationContext | null> {
  const org = await getOrganization()
  if (!org) return null
  const session = await getSession()
  if (session) {
    requireNotDemoAccount(session.user.email)
  }
  return org
}

export async function getOrganization() {
  await ensureDb()
  const session = await getSession()
  if (!session) return null

  // Use the database matching the session context.
  if (session.isDemo) {
    const { Membership: DemoMembership } = await import("./database-demo")
    const MemModel = await DemoMembership()
    const membership = await MemModel.findOne({
      userId: session.user.id,
    }).populate("organizationId")

    if (!membership) return null

    const org = membership.organizationId as unknown as { _id: { toString(): string }; name: string; slug: string }
    return {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      memberships: [],
    }
  }

  const membership = await Membership.findOne({
    userId: session.user.id,
  }).populate("organizationId")

  if (!membership) return null

  const org = membership.organizationId as unknown as { _id: { toString(): string }; name: string; slug: string }
  return {
    id: org._id.toString(),
    name: org.name,
    slug: org.slug,
    memberships: [],
  }
}

// Authentication functions
export async function signIn(email: string, password: string): Promise<{ user: SessionUser | null; error: string | null }> {
  const demoEmail = getDemoAccountEmail()
  const isDemoLogin = demoEmail ? email.trim().toLowerCase() === demoEmail : false

  if (isDemoLogin) {
    // Demo login: authenticate against demo database ONLY.
    const demoMongoose = await connectDemoDb()
    if (!demoMongoose) {
      return { user: null, error: "Invalid email or password" }
    }

    const { User: DemoUser, Membership: DemoMembership } = await import("./database-demo")
    const UserModel = await DemoUser()
    const MemModel = await DemoMembership()

    const user = await UserModel.findOne({ email }).lean() as unknown as {
      _id: { toString(): string }
      email: string
      name: string | null
      avatar: string | null
      password: string | null
      role: string
    } | null

    if (!user || !user.password) {
      return { user: null, error: "Invalid email or password" }
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return { user: null, error: "Invalid email or password" }
    }

    const membership = await MemModel.findOne({
      userId: user._id.toString(),
    }).populate("organizationId")

    if (!membership) {
      return { user: null, error: "User has no organization access" }
    }

    const org = membership.organizationId as unknown as { _id: { toString(): string }; name: string; slug: string }
    const sessionUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: org._id.toString(),
    }

    await createSession(user._id.toString(), org._id.toString(), "demo")

    return { user: sessionUser, error: null }
  }

  // Production login: authenticate against production database ONLY.
  await ensureDb()

  const user = await User.findOne({ email }).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    password: string | null
    role: string
  } | null

  if (!user || !user.password) {
    return { user: null, error: "Invalid email or password" }
  }

  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    return { user: null, error: "Invalid email or password" }
  }

  const membership = await Membership.findOne({
    userId: user._id.toString(),
  }).populate("organizationId")

  if (!membership) {
    return { user: null, error: "User has no organization access" }
  }

  const org = membership.organizationId as unknown as { _id: { toString(): string }; name: string; slug: string }
  const sessionUser = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: buildAvatarUrl(user.avatar, user._id.toString()),
    role: user.role,
    organizationId: org._id.toString(),
  }

  await createSession(user._id.toString(), org._id.toString(), "production")

  return { user: sessionUser, error: null }
}

export async function signUp(email: string, name: string, password: string): Promise<{ user: SessionUser | null; error: string | null }> {
  await ensureDb()

  // Block demo account registration in production.
  const demoEmail = getDemoAccountEmail()
  if (demoEmail && email.trim().toLowerCase() === demoEmail) {
    return { user: null, error: "This email is reserved" }
  }

  const existingUser = await User.findOne({ email }).lean() as unknown as {
    _id: { toString(): string }
    email: string
  } | null
  if (existingUser) {
    return { user: null, error: "User with this email already exists" }
  }

  const hashedPassword = await hashPassword(password)

  const user = await User.create({
    email,
    name,
    password: hashedPassword,
    role: "MEMBER",
  })

  const organization = await Organization.create({
    name: `${name}'s Workspace`,
    slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 8)}`,
  })

  await Membership.create({
    userId: user._id,
    organizationId: organization._id,
    role: "ADMIN",
  })

  await createSession(user._id.toString(), organization._id.toString(), "production")

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: organization._id.toString(),
    },
    error: null
  }
}
