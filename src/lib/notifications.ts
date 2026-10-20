"use server"

import { Notification } from "./mongoose"

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
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await Notification.create({
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
