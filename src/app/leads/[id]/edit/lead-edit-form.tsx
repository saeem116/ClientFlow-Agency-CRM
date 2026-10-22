"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"

interface LeadEditFormProps {
  lead: {
    id: string
    title: string
    description: string | null
    email: string | null
    phone: string | null
    stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST"
    source: string | null
    value: number | null
    notes: string | null
    followUpAt: string | null
    clientId: string | null
  }
  clients: { id: string; name: string }[]
}

export function LeadEditForm({ lead, clients }: LeadEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: lead.title,
    description: lead.description || "",
    email: lead.email || "",
    phone: lead.phone || "",
    stage: lead.stage,
    source: lead.source || "",
    value: lead.value?.toString() || "",
    notes: lead.notes || "",
    followUpAt: lead.followUpAt || "",
    clientId: lead.clientId || "",
  })
  const [error, setError] = useState<string | null>(null)

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        stage: formData.stage,
        source: formData.source || null,
        value: formData.value ? parseFloat(formData.value) : null,
        notes: formData.notes.trim() || null,
        followUpAt: formData.followUpAt || null,
        clientId: formData.clientId || null,
      }

      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update lead")
      }

      router.push(`/leads/${lead.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lead")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete lead")
      }

      router.push("/leads")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Edit Lead</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">
            Update information for {lead.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/leads/${lead.id}`}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Lead Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="lead@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => updateField("stage", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="PROPOSAL_SENT">Proposal Sent</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source || "OTHER"}
                  onValueChange={(value) => updateField("source", value)}
                >
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
              <div className="space-y-2">
                <Label htmlFor="value">Estimated Value ($)</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => updateField("value", e.target.value)}
                  placeholder="15000"
                  step="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpAt">Follow-up Date</Label>
                <Input
                  id="followUpAt"
                  name="followUpAt"
                  type="date"
                  value={formData.followUpAt}
                  onChange={(e) => updateField("followUpAt", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientId">Associated Client</Label>
                <Select
                  value={formData.clientId || "none"}
                  onValueChange={(value) => updateField("clientId", value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Additional details about this lead..."
                  rows={3}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
