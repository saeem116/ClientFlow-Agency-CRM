import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect } from "next/navigation"
import { ProjectsPageClient } from "./projects-page-client"

export default async function ProjectsPage() {
  await ensureDb()
  const session = await getSession()
  const models = await getModels(session)
  const Project = models.Project
  const Milestone = models.Milestone
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const projects = await Project.find({ organizationId: org.id })
    .populate({ path: "clientId", select: "companyName firstName lastName" })
    .sort({ updatedAt: -1 })
    .lean()
    .exec()

  const projectIds = projects.map((p: { _id: { toString(): string } }) => p._id)
  const milestones = await Milestone.find({ projectId: { $in: projectIds } }).lean()
  interface MilestoneLean {
    _id: { toString(): string };
    projectId: { toString(): string } | null;
    completedAt: Date | null;
  }
  const milestonesTyped = milestones as unknown as MilestoneLean[]
  const milestonesByProject = new Map<string, Array<{ id: string; completedAt: Date | null }>>()
  for (const m of milestonesTyped) {
    const pid = m.projectId?.toString() ?? ""
    if (!milestonesByProject.has(pid)) milestonesByProject.set(pid, [])
    milestonesByProject.get(pid)!.push({
      id: m._id.toString(),
      completedAt: m.completedAt || null,
    })
  }

  // Normalize client to match the Project interface expected by the client component
  interface ProjectLean {
    _id: { toString(): string };
    name: string;
    description: string | null;
    status: string;
    priority: string;
    budget: number | null;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    clientId: { toString(): string } | null;
    organizationId: { toString(): string };
    createdById: { toString(): string } | null;
    client: {
      _id: { toString(): string };
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }

  const normalizedProjects = (projects as unknown as ProjectLean[]).map((project: ProjectLean) => ({
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
    client: project.clientId && typeof project.clientId === "object"
      ? {
          id: ((project.clientId as unknown as { _id?: { toString(): string } })._id?.toString()) || ((project.clientId as unknown as { id?: string }).id) || "unknown",
          name: (project.clientId as unknown as { companyName?: string }).companyName || "Unnamed",
        }
      : project.client
        ? {
            id: project.client._id?.toString() || "unknown",
            name: project.client.companyName || "Unnamed",
          }
        : null,
    tasks: [],
    milestones: milestonesByProject.get(project._id.toString()) || [],
  }))

  return <ProjectsPageClient projects={normalizedProjects} />
}
