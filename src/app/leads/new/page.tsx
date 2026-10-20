import { ensureDb } from "@/lib/database"
import { Lead } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Save, X } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "New Lead - ClientFlow",
  description: "Create a new lead",
}

export default async function NewLeadPage() {
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Lead</h1>
          <p className="text-slate-500 mt-1">Create a new lead in your pipeline</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/leads">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadForm org={org} />
        </CardContent>
      </Card>
    </div>
  )
}

function LeadForm({ org }: { org: { id: string; name: string } }) {
  return (
    <form action={createLead} className="space-y-6">
      <input type="hidden" name="organizationId" value={org.id} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Lead Title *</Label>
          <Input id="title" name="title" placeholder="Website redesign for Acme Inc." required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="value">Estimated Value ($)</Label>
          <Input id="value" name="value" type="number" placeholder="15000" step="100" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select name="source" defaultValue="WEBSITE">
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEBSITE">Website</SelectItem>
              <SelectItem value="REFERRAL">Referral</SelectItem>
              <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="PHONE">Phone</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="Additional details about this lead..." />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" /> Create Lead
        </Button>
      </div>
    </form>
  )
}

async function createLead(formData: FormData) {
  "use server"
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const title = formData.get("title") as string
  const value = formData.get("value") as string
  const source = formData.get("source") as string
  const notes = formData.get("notes") as string

  if (!title) throw new Error("Title is required")

  await Lead.create({
    title,
    value: value ? parseFloat(value) : undefined,
    source: (source as any) || "OTHER",
    notes: notes || null,
    stage: "NEW",
    organizationId: org.id,
  })

  redirect("/leads")
}
