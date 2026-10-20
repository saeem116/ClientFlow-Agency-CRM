import { ensureDb } from "@/lib/database"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FilesPageClient } from "./files-page-client"

export default async function FilesPage() {
  await ensureDb()
  const session = await getSession()
  if (!session?.user) {
    redirect("/sign-in")
  }

  return <FilesPageClient />
}
