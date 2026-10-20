import { ensureDb } from "@/lib/database"
import { Project } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProjectsPageClient } from "./projects-page-client"

export default async function ProjectsPage() {
  await ensureDb()
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const projects = await Project.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()
    .exec()

  // Normalize client to match the Project interface expected by the client component
  const normalizedProjects = projects.map((project: any) => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description || null,
    status: project.status,
    priority: project.priority,
    budget: project.budget || null,
    startDate: project.startDate || null,
    endDate: project.endDate || null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    clientId: project.clientId?.toString() || "",
    organizationId: project.organizationId?.toString() || "",
    createdById: project.createdById?.toString() || null,
    client: project.client
      ? {
          id: project.client._id?.toString() || "unknown",
          name: project.client.companyName || "Unnamed",
        }
      : null,
    tasks: [],
    milestones: [],
  }))

  return <ProjectsPageClient projects={normalizedProjects} />
}
