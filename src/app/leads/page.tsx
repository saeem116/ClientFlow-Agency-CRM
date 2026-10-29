import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect } from "next/navigation"
import { LeadsPageClient } from "./leads-page-client"

interface RawLead {
  _id: { toString(): string }
  title: string
  email: string | null
  stage: string
  value: number | null
  source: string | null
  followUpAt: Date | null
  clientId: {
    _id: { toString(): string }
    companyName: string | null
    firstName: string | null
    lastName: string | null
  } | null
}

export default async function LeadsPage() {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Lead = models.Lead
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const isDemo = session?.isDemo ?? false

  const leads = await Lead.find({ organizationId: org.id })
    .populate({ path: "clientId", select: "companyName firstName lastName" })
    .sort({ createdAt: -1 })
    .lean()
    .exec() as unknown as RawLead[]

  // Normalize to match the Lead interface in leads-page-client
  const normalizedLeads = leads.map((lead: any) => ({
    id: lead._id?.toString() || lead.id,
    title: lead.title,
    email: lead.email,
    stage: lead.stage as "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST",
    value: lead.value || null,
    source: lead.source || null,
    followUpAt: lead.followUpAt || null,
    client: lead.clientId && typeof lead.clientId === "object"
      ? {
          id: lead.clientId._id?.toString() || lead.clientId.id,
          name: lead.clientId.companyName || `${lead.clientId.firstName || ""} ${lead.clientId.lastName || ""}`.trim() || "Unnamed",
        }
      : null,
  }))

  return <LeadsPageClient leads={normalizedLeads} isDemo={isDemo} />
}