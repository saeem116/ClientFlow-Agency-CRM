import { ensureDb } from "@/lib/database"
import { Lead } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LeadsPageClient } from "./leads-page-client"

export default async function LeadsPage() {
  await ensureDb()
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const leads = await Lead.find({ organizationId: org.id })
    .sort({ createdAt: -1 })
    .lean()
    .exec()

  // Normalize to match the Lead interface in leads-page-client
  const normalizedLeads = leads.map((lead: any) => ({
    id: lead._id.toString(),
    title: lead.title,
    email: lead.email,
    stage: lead.stage as "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST",
    value: lead.value || null,
    source: lead.source || null,
    followUpAt: lead.followUpAt || null,
    client: lead.client
      ? {
          id: lead.client._id.toString(),
          name: lead.client.companyName || "Unnamed",
        }
      : null,
  }))

  return <LeadsPageClient leads={normalizedLeads} />
}
