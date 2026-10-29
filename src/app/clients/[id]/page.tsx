import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
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

  const models = await getModels(session)
  const Client = models.Client
  const File = models.File
  const Project = models.Project
  const Milestone = models.Milestone
  const Task = models.Task
  const Invoice = models.Invoice
  const Activity = models.Activity

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
    createdAt?: Date
    updatedAt?: Date
    organizationId: { toString(): string }
    createdById?: { toString(): string } | null
  } | null

  if (!client) notFound()

  // Fetch related data for the client detail view
  const [projects, invoices, activities] = await Promise.all([
    Project.find({ clientId: id, organizationId: org.id }).lean() as unknown as Promise<any[]>,
    Invoice.find({ clientId: id, organizationId: org.id }).lean() as unknown as Promise<any[]>,
    Activity.find({ clientId: id, organizationId: org.id }).sort({ createdAt: -1 }).limit(50).lean() as unknown as Promise<any[]>,
  ])

  const projectIds = projects.map((p) => p._id)
  const [tasks, milestones] = await Promise.all([
    Task.find({ projectId: { $in: projectIds }, organizationId: org.id }).lean() as unknown as Promise<any[]>,
    Milestone.find({ projectId: { $in: projectIds } }).lean() as unknown as Promise<any[]>,
  ])

  const files = await File.find({ clientId: id, organizationId: org.id }).lean() as any[]

  const tasksByProject = new Map<string, any[]>()
  for (const t of tasks) {
    const pid = t.projectId?.toString() ?? ""
    if (!tasksByProject.has(pid)) tasksByProject.set(pid, [])
    tasksByProject.get(pid)!.push(t)
  }
  const milestonesByProject = new Map<string, any[]>()
  for (const m of milestones) {
    const pid = m.projectId?.toString() ?? ""
    if (!milestonesByProject.has(pid)) milestonesByProject.set(pid, [])
    milestonesByProject.get(pid)!.push(m)
  }

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
        projects: projects.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          description: p.description || null,
          status: p.status,
          endDate: p.endDate || null,
          tasks: (tasksByProject.get(p._id.toString()) || []).map((t) => ({
            id: t._id.toString(),
            status: t.status,
          })),
          milestones: (milestonesByProject.get(p._id.toString()) || []).map((m) => ({
            id: m._id.toString(),
            completedAt: m.completedAt || null,
          })),
        })),
        invoices: invoices.map((inv) => ({
          id: inv._id.toString(),
          number: inv.number,
          status: inv.status,
          issueDate: inv.issueDate,
          total: inv.total,
          paidAmount: inv.paidAmount,
        })),
        activities: activities.map((a) => ({
          id: a._id.toString(),
          title: a.title,
          description: a.description,
          createdAt: a.createdAt,
        })),
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
