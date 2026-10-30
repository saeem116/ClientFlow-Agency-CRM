/**
 * Context-aware model selector for API routes.
 *
 * Every GET route that reads data (clients, leads, projects, tasks, invoices,
 * milestones) must return the demo DB content when the session is `isDemo: true`.
 * The existing routes import models from `@/lib/database` (production only) so
 * the demo reviewer always sees an empty dataset.
 *
 * This module provides `getModels(session)` which returns the correct
 * Mongoose model set. Call it with the session object obtained via
 * `getSession()` at the top of the route handler.
 *
 * Usage:
 *   const session = await getSession()
 *   const { Client, Project, Lead, Task, Invoice, Payment } = await getModels(session)
 *   const items = await Client.find({ organizationId: org.id })
 */
import type { Model, Document } from "mongoose"

import { getSession } from "@/lib/auth"
import { Session } from "@/lib/auth"

/**
 * Returns the correct Mongoose model for each entity based on the current
 * session context (demo vs production).
 *
 * Demo sessions → `database-demo.ts` models (second Mongoose instance).
 * Production / no session → `database.ts` models (main Mongoose instance).
 */
export async function getModels(
  sessionOverride?: { isDemo: boolean } | null
): Promise<{
  User: Model<Document>
  Organization: Model<Document>
  Membership: Model<Document>
  Client: Model<Document>
  Lead: Model<Document>
  Project: Model<Document>
  Task: Model<Document>
  Milestone: Model<Document>
  Invoice: Model<Document>
  InvoiceLineItem: Model<Document>
  Payment: Model<Document>
  Activity: Model<Document>
  Notification: Model<Document>
  Invitation: Model<Document>
  File: Model<Document>
}> {
  const session = sessionOverride ?? null
  const isDemo = session?.isDemo ?? false

  if (isDemo) {
    const demo = await import("./database-demo")
    return {
      User: await demo.User(),
      Organization: await demo.Organization(),
      Membership: await demo.Membership(),
      Client: await demo.Client(),
      Lead: await demo.Lead(),
      Project: await demo.Project(),
      Task: await demo.Task(),
      Milestone: await demo.Milestone(),
      Invoice: await demo.Invoice(),
      InvoiceLineItem: await demo.InvoiceLineItem(),
      Payment: await demo.Payment(),
      Activity: await demo.Activity(),
      Notification: await demo.Notification(),
      Invitation: await demo.Invitation(),
      File: (await import("./database")).File,
    }
  }

  const prod = await import("./database")
  return {
    User: prod.User,
    Organization: prod.Organization,
    Membership: prod.Membership,
    Client: prod.Client,
    Lead: prod.Lead,
    Project: prod.Project,
    Task: prod.Task,
    Milestone: prod.Milestone,
    Invoice: prod.Invoice,
    InvoiceLineItem: prod.InvoiceLineItem,
    Payment: prod.Payment,
    Activity: prod.Activity,
    Notification: prod.Notification,
    Invitation: prod.Invitation,
    File: prod.File,
  }
}