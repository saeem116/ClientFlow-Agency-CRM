import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { WelcomePageClient } from "./welcome-client"

export default async function Home() {
  const session = await getSession()

  // Redirect authenticated users straight to their dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return <WelcomePageClient />
}