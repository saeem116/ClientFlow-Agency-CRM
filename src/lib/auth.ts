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
}

const SESSION_COOKIE_NAME = "session"

/**
 * Check if the given email matches the configured admin email.
 *
 * Normalizes both sides to lowercase to avoid case-sensitivity issues.
 * Returns false when ADMIN_EMAIL is not configured, which is the safe default.
 */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return false
  return email?.trim().toLowerCase() === adminEmail.trim().toLowerCase()
}

/**
 * Read and validate the session cookie for the current request.
 *
 * The session token is opaque base64 (NOT signed). It is only ever written by
 * our own auth API routes and is httpOnly, so the only realistic abuse vector
 * is tampering/expiry. We therefore:
 *   - reject malformed tokens,
 *   - reject tokens whose embedded `userId` no longer resolves to a user,
 *   - reject tokens whose embedded `organizationId` no longer matches the
 *     user's active membership (handles org deletion / role changes),
 *   - reject tokens older than `SESSION_MAX_AGE_MS`.
 *
 * Never trust the client to supply auth state: every check happens here.
 */
/**
 * Return a fully-qualified avatar URL that works even when the browser
 * requests it from next/image (which does not carry cookies for protected
 * origins). The server-side session is used during sign-in/sign-up to build
 * the URL; the runtime build-time env var provides the origin used for
 * rendering the initial HTML and for any client-side fetches that need an
 * absolute path.
 *
 * When NEXT_PUBLIC_AVATAR_BASE_URL is configured (recommended for production
 * and local dev), the URL is absolute so the image loader can reach it.
 * Otherwise we fall back to a relative path — this works only when the
 * browser sends cookies with the request.
 */
function buildAvatarUrl(avatarId: string | null | undefined, userId: string): string | null {
  if (!avatarId) return null
  if (typeof avatarId === "string" && avatarId.startsWith("http")) return avatarId
  const baseUrl = process.env.NEXT_PUBLIC_AVATAR_BASE_URL || ""
  if (baseUrl) {
    return `${baseUrl}/api/avatars/${userId}`
  }
  return `/api/avatars/${userId}`
}

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

  if (!sessionToken) {
    return null
  }

  const payload = decodeSession(sessionToken)
  if (!payload) {
    return null
  }
  if (isSessionExpired(payload)) {
    return null
  }

  const user = await User.findById(payload.userId).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    role: string
  } | null
  if (!user) {
    return null
  }

  // Re-validate that the user still belongs to the organization recorded in
  // the token. If the org was deleted or the membership removed, the session
  // is no longer valid even though the cookie itself is intact.
  const _membership = await Membership.findOne({
    userId: user._id.toString(),
    organizationId: payload.organizationId,
  }).lean() as unknown as { role: string; userId: { toString(): string }; organizationId: { toString(): string } } | null
  if (!_membership) {
    return null
  }

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: payload.organizationId,
    }
  }
}

export async function createSession(userId: string, organizationId: string): Promise<void> {
  const sessionData: SessionPayload = {
    userId,
    organizationId,
    timestamp: Date.now(),
  }

  const sessionToken = encodeSession(sessionData)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000), // 7 days
    path: "/",
  })
}

export async function validateSession(): Promise<{ valid: boolean; user: SessionUser | null; error: string | null }> {
  const session = await getSession()
  if (!session) {
    return { valid: false, user: null, error: "No valid session found" }
  }
  return { valid: true, user: session.user, error: null }
}

/**
 * Server-side helper that returns the authenticated user for the current
 * request, or `null`. Used by the `/api/auth/me` endpoint, which is the single
 * source of truth the client polls to refresh its auth state. The client never
 * reads the httpOnly cookie directly.
 */
export async function getCurrentUser(): Promise<Session | null> {
  return getSession()
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect("/sign-in")
}

/**
 * Look up a user by email (case-insensitive).
 * Returns the user as a plain object or null if not found.
 */
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

/**
 * Create a new user (no password — email-based auth only), set up their
 * personal organization, add them to the target organization with the given
 * role, and establish a server-side session.
 *
 * Returns the session user on success, or an error message on failure.
 */
export async function createUserAndSession(
  email: string,
  role: string,
  organizationId: string
): Promise<{ user: SessionUser | null; error: string | null }> {
  await ensureDb()

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() }).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    role: string
  } | null
  if (existingUser) {
    return { user: null, error: "User with this email already exists" }
  }

  // Create user with no password (email-based auth only)
  const user = await User.create({
    email: email.toLowerCase().trim(),
    name: null,
    avatar: null,
    role: "MEMBER",
  })

  // Create personal organization for the new user
  const personalOrg = await Organization.create({
    name: `${email.split("@")[0]}'s Workspace`,
    slug: `${email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
  })

  // Add user to the invited organization
  await Membership.create({
    userId: user._id,
    organizationId: organizationId,
    role: role as "ADMIN" | "MEMBER" | "CLIENT",
  })

  // Also create membership in their personal org
  await Membership.create({
    userId: user._id,
    organizationId: personalOrg._id,
    role: "ADMIN",
  })

  // Establish the server-side session cookie
  await createSession(user._id.toString(), organizationId)

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      // Same normalization as above — URL carries user ID so the retrieval
      // endpoint can find the file via metadata.uploaderId.
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: organizationId,
    },
    error: null,
  }
}

export async function getOrganization() {
  await ensureDb()
  const session = await getSession()
  if (!session) return null

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
  await ensureDb()
  const user = await User.findOne({ email }).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    password: string | null
    role: string
  } | null

  if (!user) {
    // Return generic error without revealing which field was wrong (security best practice)
    return { user: null, error: "Invalid email or password" }
  }

  if (!user.password) {
    // User exists but has no password (should not happen with our signUp flow)
    return { user: null, error: "Invalid email or password" }
  }

  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    return { user: null, error: "Invalid email or password" }
  }

  // Get the user's primary organization
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

  // Establish the server-side session cookie
  await createSession(user._id.toString(), org._id.toString())

  return {
    user: sessionUser,
    error: null
  }
}

export async function signUp(email: string, name: string, password: string): Promise<{ user: SessionUser | null; error: string | null }> {
  await ensureDb()
  // Check if user already exists
  const existingUser = await User.findOne({ email }).lean() as unknown as {
    _id: { toString(): string }
    email: string
    name: string | null
    avatar: string | null
    role: string
  } | null
  if (existingUser) {
    return { user: null, error: "User with this email already exists" }
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create user
  const user = await User.create({
    email,
    name,
    password: hashedPassword,
    role: "MEMBER",
  })

  // Create organization for the new user
  const organization = await Organization.create({
    name: `${name}'s Workspace`,
    slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 8)}`,
  })

  // Create membership with ADMIN role
  await Membership.create({
    userId: user._id,
    organizationId: organization._id,
    role: "ADMIN",
  })

  // Establish the server-side session cookie
  await createSession(user._id.toString(), organization._id.toString())

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      // Same normalization — URL carries user ID, not GridFS file ID.
      avatar: buildAvatarUrl(user.avatar, user._id.toString()),
      role: user.role,
      organizationId: organization._id.toString(),
    },
    error: null
  }
}