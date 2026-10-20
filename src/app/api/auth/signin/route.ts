import { NextRequest, NextResponse } from "next/server"
import { ensureDb, User, Membership } from "@/lib/database"
import { verifyPassword } from "@/lib/bcrypt"

export async function POST(request: NextRequest) {
  await ensureDb()
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both email and password" },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email }).lean() as unknown as {
      _id: { toString(): string }
      email: string
      name: string | null
      avatar: string | null
      password: string | null
      role: string
    } | null

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Get the user's primary organization
    const membership = await Membership.findOne({
      userId: user._id,
    }).populate("organizationId")

    if (!membership) {
      return NextResponse.json(
        { error: "User has no organization access" },
        { status: 401 }
      )
    }

    const org = membership.organizationId as unknown as { _id: { toString(): string }; name: string; slug: string }
    // Create session data
    const sessionData = {
      userId: user._id.toString(),
      organizationId: org._id.toString(),
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
        organizationId: org._id.toString(),
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
    console.error("Sign-in error:", error)
    return NextResponse.json(
      { error: "An error occurred during sign-in" },
      { status: 500 }
    )
  }
}
