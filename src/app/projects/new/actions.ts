"use server"

import { redirect } from "next/navigation"
import { ensureDb, Project } from "@/lib/database"
import { getOrganization } from "@/lib/auth"

/**
 * Server action for creating a new project.
 *
 * Validates the client ID before creating the project so that invalid
 * requests cannot bypass the client-side check.
 */
export async function createProject(formData: FormData) {
  await ensureDb()
  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const clientId = formData.get("clientId") as string
  const priority = formData.get("priority") as string
  const budget = formData.get("budget") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  if (!name) throw new Error("Project name is required")
  if (!clientId) throw new Error("Please select a client before creating the project")

  // Try to create the project — if it fails due to validation, surface the error
  try {
    await Project.create({
      name,
      description: description || null,
      clientId: clientId || undefined,
      priority: (priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
      budget: budget ? parseFloat(budget) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: "DRAFT",
      organizationId: org.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create project"
    if (message.includes("clientId")) {
      throw new Error("Please select a client before creating the project")
    }
    throw new Error(message)
  }

  redirect("/projects")
}