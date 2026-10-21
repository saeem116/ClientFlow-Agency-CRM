import { ensureDb } from "@/lib/database"
import { Client, Membership, User } from "@/lib/database"
import { getOrganization, requireOrg, getSession } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export const metadata = {
  title: "New Client - ClientFlow",
  description: "Create a new client",
}

export default async function NewClientPage() {
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const clients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Client</h1>
          <p className="text-slate-500 mt-1">Create a new client profile</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/clients">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </div>

      <ClientForm org={org} existingClients={clients} />
    </div>
  )
}

function ClientForm({ org, existingClients }: {
  org: { id: string; name: string }
  existingClients: any[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createClient} className="space-y-6">
          <input type="hidden" name="organizationId" value={org.id} />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input id="name" name="name" placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="john@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" name="companyName" placeholder="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="status">Client Status</Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> Create Client
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

async function createClient(formData: FormData) {
  "use server"
  await ensureDb()
  const org = await requireOrg()
  if (!org) redirect("/sign-in")

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const companyName = formData.get("companyName") as string
  const phone = formData.get("phone") as string
  const status = formData.get("status") as string

  if (!name || !email) throw new Error("Name and email are required")

  await Client.create({
    firstName: name.split(" ")[0] || null,
    lastName: name.split(" ").slice(1).join(" ") || null,
    email: email.toLowerCase().trim(),
    companyName: companyName || null,
    phone: phone || null,
    status: (status as "active" | "inactive" | "prospect") || "active",
    organizationId: org.id,
  })

  redirect("/clients")
}
