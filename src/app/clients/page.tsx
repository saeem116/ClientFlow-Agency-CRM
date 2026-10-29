import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect } from "next/navigation"
import { ClientsPageClient } from "./clients-page-client"

export default async function ClientsPage() {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Client = models.Client
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const clients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()
    .exec()

  // Normalize to match the Client interface in clients-page-client
  const normalizedClients = clients.map((client: any) => ({
    id: client._id.toString(),
    name:
      client.companyName ||
      `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
      "Unnamed",
    email: client.email || "",
    phone: client.phone || null,
    companyName: client.companyName || null,
    status: client.status || "active",
    updatedAt: client.updatedAt || new Date(),
    projects: [],
    _count: { invoices: 0 },
  }))

  return <ClientsPageClient clients={normalizedClients} />
}
