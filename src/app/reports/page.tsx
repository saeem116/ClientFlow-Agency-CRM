import { ensureDb } from "@/lib/database"
import { Invoice, Lead, Project, Task, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReportsPageClient } from "./reports-page-client"

export default async function ReportsPage() {
  await ensureDb()
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const [invoices, leads, projects, tasks, clients] = await Promise.all([
    Invoice.find({ organizationId: org.id }).lean().exec(),
    Lead.find({ organizationId: org.id }).lean().exec(),
    Project.find({ organizationId: org.id }).lean().exec(),
    Task.find({}).lean().exec(),
    Client.find({ organizationId: org.id }).lean().exec(),
  ])

  return (
    <ReportsPageClient
      invoices={invoices.map((i: any) => ({
        status: i.status,
        total: i.total,
        paidAmount: i.paidAmount || 0,
        issueDate: i.issueDate,
      }))}
      leads={leads.map((l: any) => ({
        stage: l.stage,
        value: l.value || 0,
      }))}
      projects={projects.map((p: any) => ({
        status: p.status,
      }))}
      tasks={tasks.map((t: any) => ({
        status: t.status,
        dueDate: t.dueDate,
      }))}
      clients={clients.map((c: any) => ({
        status: c.status,
      }))}
    />
  )
}
