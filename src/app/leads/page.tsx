import { ensureDb } from "@/lib/database"
import { Lead } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
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
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const session = await getSession()
  const isDemo = session?.isDemo ?? false

  const leads = await Lead.find({ organizationId: org.id })
    .populate({ path: "clientId", select: "companyName firstName lastName" })
    .sort({ createdAt: -1 })
    .lean()
    .exec() as unknown as RawLead[]

  // Normalize to match the Lead interface in leads-page-client
  const normalizedLeads = leads.map((lead) => ({
    id: lead._id.toString(),
    title: lead.title,
    email: lead.email,
    stage: lead.stage as "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST",
    value: lead.value || null,
    source: lead.source || null,
    followUpAt: lead.followUpAt || null,
    client: lead.clientId
      ? {
          id: lead.clientId._id.toString(),
          name: lead.clientId.companyName || `${lead.clientId.firstName || ""} ${lead.clientId.lastName || ""}`.trim() || "Unnamed",
        }
      : null,
  }))

  return <LeadsPageClient leads={normalizedLeads} isDemo={isDemo} />
}