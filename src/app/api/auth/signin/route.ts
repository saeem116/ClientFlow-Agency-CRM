import { NextRequest, NextResponse } from "next/server"
import { signIn } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both email and password" },
        { status: 400 }
      )
    }

    const result = await signIn(email.trim(), password)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: result.user,
    })
  } catch (error) {
    console.error("Sign-in error:", error)
    return NextResponse.json(
      { error: "An error occurred during sign-in" },
      { status: 500 }
    )
  }
}
