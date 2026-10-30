import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect } from "next/navigation"
import { ReportsPageClient } from "./reports-page-client"
import { sanitize } from "@/lib/sanitize"

interface LeanDoc {
  _id?: { toString(): string }
  id?: string
  [key: string]: unknown
}

interface InvoiceLean extends LeanDoc {
  status?: string
  total?: number
  paidAmount?: number
  issueDate?: Date | string
}

interface LeadLean extends LeanDoc {
  stage?: string
  value?: number
}

interface ProjectLean extends LeanDoc {
  status?: string
}

interface TaskLean extends LeanDoc {
  status?: string
  dueDate?: Date | string | null
}

interface ClientLean extends LeanDoc {
  status?: string
}

export default async function ReportsPage() {
  await ensureDb()
  const session = await getSession()
  const org = await getOrganization()

  if (!session?.user || !org) {
    redirect("/sign-in")
  }

  const models = await getModels(session)
  const Invoice = models.Invoice
  const Lead = models.Lead
  const Project = models.Project
  const Task = models.Task
  const Client = models.Client

  const [invoices, leads, projects, tasks, clients] = await Promise.all([
    sanitize(
      await Invoice.find({ organizationId: org.id }).lean().exec()
    ) as unknown as InvoiceLean[],
    sanitize(
      await Lead.find({ organizationId: org.id }).lean().exec()
    ) as unknown as LeadLean[],
    sanitize(
      await Project.find({ organizationId: org.id }).lean().exec()
    ) as unknown as ProjectLean[],
    sanitize(
      await Task.find({ organizationId: org.id }).lean().exec()
    ) as unknown as TaskLean[],
    sanitize(
      await Client.find({ organizationId: org.id }).lean().exec()
    ) as unknown as ClientLean[],
  ])

  return (
    <ReportsPageClient
      invoices={invoices.map((i: InvoiceLean) => ({
        status: i.status,
        total: i.total,
        paidAmount: i.paidAmount || 0,
        issueDate: i.issueDate,
      }))}
      leads={leads.map((l: LeadLean) => ({
        stage: l.stage,
        value: l.value || 0,
      }))}
      projects={projects.map((p: ProjectLean) => ({
        status: p.status,
      }))}
      tasks={tasks.map((t: TaskLean) => ({
        status: t.status,
        dueDate: t.dueDate,
      }))}
      clients={clients.map((c: ClientLean) => ({
        status: c.status,
      }))}
    />
  )
}