import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { redirect, notFound } from "next/navigation"
import { ProjectDetailPageClient } from "./project-detail-client"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  const Project = models.Project
  const Client = models.Client
  const Task = models.Task
  const Milestone = models.Milestone
  const Activity = models.Activity

  // Reject malformed ObjectIds cleanly (Mongoose CastError would otherwise
  // surface as a 500). A non-existent or inaccessible record returns 404.
  const mongoose = await import("mongoose")
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound()
  }

  const project = await Project.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
    _id: { toString(): string }
    name: string
    description?: string | null
    status: string
    priority: string
    budget?: number | null
    startDate?: Date | null
    endDate?: Date | null
    createdAt?: Date
    updatedAt?: Date
    clientId?: { toString(): string } | null
    organizationId: { toString(): string }
    createdById?: { toString(): string } | null
  } | null

  if (!project) {
    notFound()
  }

  // Fetch related data
  const client = await Client.findById(project.clientId).lean() as unknown as {
    _id: { toString(): string }
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
  } | null
  const tasks = await Task.find({ projectId: id }).sort({ status: 1, dueDate: 1 }).lean()
  const milestones = await Milestone.find({ projectId: id }).sort({ dueDate: 1, createdAt: 1 }).lean()
  const activities = await Activity.find({ projectId: id }).sort({ createdAt: -1 }).limit(20).lean()

  const clientName = client
    ? client.companyName ||
      `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"
    : "Unknown"

  return (
    <ProjectDetailPageClient
      isDemo={session?.isDemo ?? false}
      project={{
        id: project._id.toString(),
        name: project.name,
        description: project.description || null,
        status: project.status,
        priority: project.priority,
        budget: project.budget || null,
        startDate: project.startDate || null,
        endDate: project.endDate || null,
        createdAt: project.createdAt || new Date(),
        updatedAt: project.updatedAt || new Date(),
        clientId: project.clientId?.toString() || "",
        organizationId: project.organizationId?.toString() || "",
        createdById: project.createdById?.toString() || null,
        clientName,
        client: client ? {
          id: client._id.toString(),
          firstName: client.firstName || null,
          lastName: client.lastName || null,
          companyName: client.companyName || null,
          email: client.email || null,
        } : null,
        tasks: (tasks as unknown as Array<{
          _id: { toString(): string };
          title: string;
          status: string;
          assigneeId: { toString(): string } | null;
        }>).map((t: {
          _id: { toString(): string };
          title: string;
          status: string;
          assigneeId: { toString(): string } | null;
        }) => ({
          id: t._id.toString(),
          title: t.title,
          status: t.status,
          assignee: t.assigneeId ? { id: t.assigneeId.toString(), name: "User", email: "" } : null,
        })),
        milestones: (milestones as unknown as Array<{
          _id: { toString(): string };
          title: string;
          description: string | null;
          dueDate: Date | null;
          completedAt: Date | null;
        }>).map((m: {
          _id: { toString(): string };
          title: string;
          description: string | null;
          dueDate: Date | null;
          completedAt: Date | null;
        }) => ({
          id: m._id.toString(),
          title: m.title,
          description: m.description || null,
          dueDate: m.dueDate || null,
          completedAt: m.completedAt || null,
        })),
        activities: (activities as unknown as Array<{
          _id: { toString(): string };
          type: string;
          title: string;
          description: string | null;
          createdAt: Date;
        }>).map((a: {
          _id: { toString(): string };
          type: string;
          title: string;
          description: string | null;
          createdAt: Date;
        }) => ({
          id: a._id.toString(),
          type: a.type,
          title: a.title,
          description: a.description,
          createdAt: a.createdAt,
        })),
      }}
    />
  )
}

export const metadata = {
  title: "Project - ClientFlow",
  description: "Project details and information",
}