import { ensureDb } from "@/lib/database"
import { Client, File as FileModel } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { ClientDetailPageClient } from "./client-detail-client"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const session = await getSession()
  if (!session?.user) {
    redirect("/sign-in")
  }

  const org = await getOrganization()
  if (!org) {
    redirect("/sign-in")
  }

  const client = await Client.findOne({ _id: id, organizationId: org.id }).lean()

  if (!client) notFound()

  const files = await FileModel.find({ clientId: id, organizationId: org.id }).lean()

  return (
    <ClientDetailPageClient
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
        notes: client.notes || null,
        status: client.status || "active",
        createdAt: client.createdAt || new Date(),
        updatedAt: client.updatedAt || new Date(),
        organizationId: client.organizationId?.toString() || "",
        createdById: client.createdById?.toString() || null,
      }}
      initialFiles={files.map((f) => ({
        id: f._id.toString(),
        fileId: f.fileId,
        originalFilename: f.originalFilename,
        contentType: f.contentType,
        size: f.size,
        createdAt: f.createdAt.toISOString(),
      }))}
    />
  )
}

export const metadata = {
  title: "Client - ClientFlow",
  description: "Client details and information",
}
