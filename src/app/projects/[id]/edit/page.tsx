import { ensureDb } from "@/lib/database"
import { Project, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { ProjectEditForm } from "../project-edit-form"
import { sanitize } from "@/lib/sanitize"

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const rawProject = await Project.findOne({ _id: id, organizationId: org.id }).lean()
  const project = sanitize(rawProject) as {
    _id: { toString(): string }
    name: string
    description?: string | null
    status: string
    priority: string
    budget?: number | null
    startDate?: Date | null
    endDate?: Date | null
    clientId?: { toString(): string } | null
    organizationId: { toString(): string }
    createdById?: { toString(): string } | null
  } | null

  if (!project) notFound()

  const rawClients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()
  // Convert Mongoose documents to plain serializable objects for Client Components
  const clients = (rawClients || []).map((c: any) => ({
    id: c._id.toString(),
    firstName: c.firstName || null,
    lastName: c.lastName || null,
    companyName: c.companyName || null,
    email: c.email || null,
    phone: c.phone || null,
    status: c.status || "active",
  }))

  const clientName = project.clientId
    ? `Project ${project._id.toString()}`
    : "Unknown"

  return (
    <ProjectEditForm
      project={{
        id: project._id.toString(),
        name: project.name,
        description: project.description || null,
        status: project.status,
        priority: project.priority,
        budget: project.budget || null,
        startDate: project.startDate || null,
        endDate: project.endDate || null,
        clientId: project.clientId?.toString() || "",
        organizationId: project.organizationId?.toString() || "",
        createdById: project.createdById?.toString() || null,
        clientName,
        client: project.clientId ? {
          id: project.clientId.toString(),
          companyName: "Client",
          firstName: null,
          lastName: null,
        } : null,
      }}
      clients={clients.map((c: any) => ({
        id: c._id?.toString() || "",
        companyName: c.companyName || null,
        firstName: c.firstName || null,
        lastName: c.lastName || null,
      }))}
    />
  )
}

export const metadata = {
  title: "Edit Project - ClientFlow",
  description: "Edit project details",
}
