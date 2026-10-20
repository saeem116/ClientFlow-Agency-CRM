import { ensureDb } from "@/lib/database"
import { Invoice } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InvoicesPageClient } from "./invoices-page-client"

export default async function InvoicesPage() {
  await ensureDb()
  const org = await getOrganization()

  if (!org) {
    redirect("/sign-in")
  }

  const invoices = await Invoice.find({ organizationId: org.id })
    .sort({ issueDate: -1 })
    .lean()
    .exec()

  // Normalize to match the Invoice interface in invoices-page-client
  const normalizedInvoices = invoices.map((invoice: any) => ({
    id: invoice._id.toString(),
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate || null,
    total: invoice.total,
    paidAmount: invoice.paidAmount || 0,
    clientId: invoice.clientId?.toString() || "",
    organizationId: invoice.organizationId?.toString() || "",
    notes: invoice.notes || null,
    subtotal: invoice.subtotal || 0,
    taxRate: invoice.taxRate || 0,
    taxAmount: invoice.taxAmount || 0,
    client: {
      id: invoice.clientId?.toString() || "",
      name: invoice.clientName || "Unnamed",
    },
    payments: [],
  }))

  return <InvoicesPageClient invoices={normalizedInvoices} />
}
