import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { notFound, redirect } from "next/navigation"
import { LeadDetailPageClient } from "./lead-detail-client"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const models = await getModels(session)
  const Lead = models.Lead
  const Client = models.Client

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
    organizationId: { toString(): string }
    clientId: { toString(): string } | null
    createdById: { toString(): string } | null
    createdAt: Date
    updatedAt: Date
  } | null

  if (!lead) notFound()

  let client = null
  if (lead.clientId) {
    client = await Client.findById(lead.clientId).lean() as unknown as {
      _id: { toString(): string }
      firstName?: string | null
      lastName?: string | null
      companyName?: string | null
    } | null
  }

  return (
    <LeadDetailPageClient
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
        followUpAt: lead.followUpAt || null,
        organizationId: lead.organizationId.toString(),
        clientId: lead.clientId?.toString() || null,
        createdById: lead.createdById?.toString() || null,
        createdAt: lead.createdAt || new Date(),
        updatedAt: lead.updatedAt || new Date(),
        client: client
          ? {
              id: client._id.toString(),
              name: client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed",
            }
          : null,
      }}
    />
  )
}

export const metadata = {
  title: "Lead - ClientFlow",
  description: "Lead details and information",
}
