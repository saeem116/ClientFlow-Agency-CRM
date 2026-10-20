import { ensureDb } from "@/lib/database"
import { Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { ClientEditForm } from "./client-edit-form"

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const client = await Client.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
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
    status: string
  } | null

  if (!client) notFound()

  return (
    <ClientEditForm
      client={{
        id: client._id.toString(),
        firstName: client.firstName || null,
        lastName: client.lastName || null,
        companyName: client.companyName || null,
        email: client.email || null,
        phone: client.phone || null,
        website: client.website || null,
        address: client.address || null,
        city: client.city || null,
        country: client.country || null,
        status: client.status || "active",
        notes: client.notes || null,
      }}
    />
  )
}

export const metadata = {
  title: "Edit Client - ClientFlow",
  description: "Edit client details",
}
