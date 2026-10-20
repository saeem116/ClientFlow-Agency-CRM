import { ensureDb } from "@/lib/database"
import { User } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function POST() {
  await ensureDb()
  // Clear session cookie
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  })
  redirect("/sign-in")
}
