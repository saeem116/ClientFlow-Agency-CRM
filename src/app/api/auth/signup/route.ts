import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User, Membership, Organization } from "@/lib/database"
import { hashPassword } from "@/lib/bcrypt"

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

    // Check if user already exists
    const existingUser = await User.findOne({ email }).lean()
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
    const membership = await Membership.create({
      userId: user._id,
      organizationId: organization._id,
      role: "ADMIN",
    })

    // Create session data
    const sessionData = {
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      timestamp: Date.now(),
    }

    // Create session token (URL-safe base64 without padding)
    const sessionToken = Buffer.from(JSON.stringify(sessionData))
      .toString('base64url')

    // Create response with the session cookie
    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        organizationId: organization._id.toString(),
      },
    })

    // Set the session cookie
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Sign-up error:", error)
    return NextResponse.json(
      { error: "An error occurred during sign-up" },
      { status: 500 }
    )
  }
}
