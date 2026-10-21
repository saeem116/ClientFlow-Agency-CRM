import { NextRequest } from "next/server"
import { ensureDb, Client, Project, Task, Invoice, Lead } from "@/lib/database"
import { getOrganization } from "@/lib/auth"

export async function GET(request: NextRequest) {
  await ensureDb()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return Response.json({ results: [] })
  }

  const org = await getOrganization()
  if (!org) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = query

  // Search across all entity types in parallel, scoped to the user's organization.
  // Tasks are scoped by organizationId so users cannot discover records from
  // other organizations through the global search endpoint.
  const [clients, projects, tasks, invoices, leads] = await Promise.all([
    Client.find({
      organizationId: org.id,
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { companyName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).limit(5).lean(),
    Project.find({
      organizationId: org.id,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    }).limit(5).lean(),
    Task.find({
      organizationId: org.id,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    }).limit(5).lean(),
    Invoice.find({
      organizationId: org.id,
      $or: [
        { number: { $regex: q, $options: "i" } },
      ],
    }).limit(5).lean(),
    Lead.find({
      organizationId: org.id,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).limit(5).lean(),
  ])

  // Build a unified result list with navigation hrefs
  const resultClients = clients as unknown as Array<{ _id: { toString(): string }; firstName?: string; lastName?: string; companyName?: string; email?: string }>
  const resultProjects = projects as unknown as Array<{ _id: { toString(): string }; name: string; description?: string }>
  const resultTasks = tasks as unknown as Array<{ _id: { toString(): string }; title: string; status: string }>
  const resultInvoices = invoices as unknown as Array<{ _id: { toString(): string }; number: string; status: string }>
  const resultLeads = leads as unknown as Array<{ _id: { toString(): string }; title: string; stage: string; email?: string }>

  const results = [
    ...resultClients.map((c) => ({
      id: c._id.toString(),
      type: "Client" as const,
      title: c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed",
      subtitle: c.email || undefined,
      href: `/clients/${c._id.toString()}`,
    })),
    ...resultProjects.map((p) => ({
      id: p._id.toString(),
      type: "Project" as const,
      title: p.name,
      subtitle: p.description || undefined,
      href: `/projects/${p._id.toString()}`,
    })),
    ...resultTasks.map((t) => ({
      id: t._id.toString(),
      type: "Task" as const,
      title: t.title,
      subtitle: t.status,
      href: "/tasks",
    })),
    ...resultInvoices.map((i) => ({
      id: i._id.toString(),
      type: "Invoice" as const,
      title: i.number,
      subtitle: `${i.status}`,
      href: `/invoices/${i._id.toString()}`,
    })),
    ...resultLeads.map((l) => ({
      id: l._id.toString(),
      type: "Lead" as const,
      title: l.title,
      subtitle: `${l.stage}${l.email ? ` · ${l.email}` : ""}`,
      href: "/leads",
    })),
  ]

  return Response.json({ results })
}