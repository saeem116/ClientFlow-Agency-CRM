import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User, Membership, Organization } from "@/lib/database"
import { hashPassword } from "@/lib/bcrypt"
import { createSession } from "@/lib/auth"
import { getDemoAccountEmail } from "@/lib/demo-account"

export async function POST(request: NextRequest) {
  await ensureDb()
  try {
    const { email, name, password } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Please provide all required fields" },
        { status: 400 }
      )
    }

    // Normalize email to lowercase for consistent lookups and storage
    const normalizedEmail = email.trim().toLowerCase()

    // Block demo account registration in production.
    const demoEmail = getDemoAccountEmail()
    if (demoEmail && normalizedEmail === demoEmail) {
      return NextResponse.json(
        { error: "This email is reserved" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail }).lean()
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role: "MEMBER",
    })

    // Create organization for the new user with a unique slug
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const uniqueSlug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    let organization
    try {
      organization = await Organization.create({
        name: `${name}'s Workspace`,
        slug: uniqueSlug,
      })
    } catch (orgError: any) {
      // Handle unique slug collision by retrying with a longer random suffix
      if (orgError?.code === 11000) {
        const retrySlug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
        organization = await Organization.create({
          name: `${name}'s Workspace`,
          slug: retrySlug,
        })
      } else {
        throw orgError
      }
    }

    // Create membership with ADMIN role
    await Membership.create({
      userId: user._id,
      organizationId: organization._id,
      role: "ADMIN",
    })

    // Use the centralized session creator so the cookie is always signed
    // and consistent with getSession()'s verification path.
    await createSession(user._id.toString(), organization._id.toString())

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        organizationRole: "ADMIN",
        organizationId: organization._id.toString(),
      },
    })
  } catch (error: any) {
    // Log the actual error server-side for debugging
    console.error("Sign-up error:", error?.message || error)

    // Return appropriate error messages based on error type
    if (error?.code === 11000) {
      // MongoDB duplicate key error
      const keyPattern = error?.keyPattern?.email
      if (keyPattern) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: "A user with this information already exists" },
        { status: 400 }
      )
    }

    // For other errors, return a generic message (don't leak server details)
    return NextResponse.json(
      { error: "An error occurred during sign-up. Please try again." },
      { status: 500 }
    )
  }
}