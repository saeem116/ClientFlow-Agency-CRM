import { ensureDb } from "@/lib/database"
import { Lead, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { LeadEditForm } from "./lead-edit-form"

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const lead = await Lead.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
    _id: { toString(): string }
    title: string
    description: string | null
    email: string | null
    phone: string | null
    stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST"
    source: string | null
    value: number | null
    notes: string | null
    followUpAt: Date | null
    clientId: { toString(): string } | null
  } | null

  if (!lead) notFound()

  const clients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean() as unknown as {
      _id: { toString(): string }
      firstName?: string | null
      lastName?: string | null
      companyName?: string | null
    }[]

  return (
    <LeadEditForm
      lead={{
        id: lead._id.toString(),
        title: lead.title,
        description: lead.description || null,
        email: lead.email || null,
        phone: lead.phone || null,
        stage: lead.stage,
        source: lead.source || null,
        value: lead.value || null,
        notes: lead.notes || null,
        followUpAt: lead.followUpAt ? lead.followUpAt.toISOString() : null,
        clientId: lead.clientId?.toString() || null,
      }}
      clients={clients.map((c) => ({
        id: c._id.toString(),
        name: c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed",
      }))}
    />
  )
}

export const metadata = {
  title: "Edit Lead - ClientFlow",
  description: "Edit lead details",
}
