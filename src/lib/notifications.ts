"use server"

import { getSession } from "./auth"
import { getModels } from "./database-scoped"

export interface NotificationPayload {
  userId: string
  organizationId: string
  type: string
  title: string
  message: string | null
  link: string | null
}

/**
 * Create a notification in MongoDB for a given user within an organization.
 * Uses the correct database context (demo vs production) based on the current session.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const session = await getSession()
    if (!session) {
      console.error("Failed to create notification: no session")
      return
    }

    const models = await getModels(session)
    const NotificationModel = models.Notification

    await NotificationModel.create({
      userId: payload.userId,
      organizationId: payload.organizationId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
    })
  } catch (error) {
    // Log but don't throw — notifications should never break the main flow
    console.error("Failed to create notification:", error)
  }
}
