import { ensureDb } from "@/lib/database"
import { Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Link from "next/link"
import { ProjectForm } from "./project-form"

export const metadata = {
  title: "New Project - ClientFlow",
  description: "Create a new project",
}

export default async function NewProjectPage() {
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const clients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()

  // Convert Mongoose documents to plain serializable objects before passing to a Client Component
  interface ClientLean {
    _id: { toString(): string }
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
    website?: string | null
    address?: string | null
    city?: string | null
    country?: string | null
    notes?: string | null
    status?: string
  }
  const plainClients = (clients || []).map((c: ClientLean) => ({
    id: c._id.toString(),
    firstName: c.firstName || null,
    lastName: c.lastName || null,
    companyName: c.companyName || null,
    email: c.email || null,
    phone: c.phone || null,
    website: c.website || null,
    address: c.address || null,
    city: c.city || null,
    country: c.country || null,
    notes: c.notes || null,
    status: c.status || "active",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Project</h1>
          <p className="text-slate-500 mt-1">Create a new project for a client</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/projects">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm org={org} clients={plainClients} />
        </CardContent>
      </Card>
    </div>
  )
}