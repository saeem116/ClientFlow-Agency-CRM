import { ensureDb } from "@/lib/database"
import { Invoice, Client } from "@/lib/database"
import { getOrganization } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { sanitize } from "@/lib/sanitize"

export const metadata = {
  title: "Edit Invoice - ClientFlow",
  description: "Edit invoice details",
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const org = await getOrganization()
  if (!org) redirect("/sign-in")

  const rawInvoice = await Invoice.findOne({ _id: id, organizationId: org.id }).lean()
  const invoice = sanitize(rawInvoice) as {
    _id: { toString(): string }
    number: string
    status: string
    total?: number | null
    dueDate?: Date | null
    clientId?: { toString(): string } | null
    notes?: string | null
  } | null
  if (!invoice) notFound()

  const rawClients = await Client.find({ organizationId: org.id })
    .sort({ updatedAt: -1 })
    .lean()
  // Convert Mongoose documents to plain serializable objects for Client Components
  const clients = (rawClients || []).map((c: any) => ({
    id: c._id.toString(),
    firstName: c.firstName || null,
    lastName: c.lastName || null,
    companyName: c.companyName || null,
    email: c.email || null,
    phone: c.phone || null,
    status: c.status || "active",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">Edit Invoice {invoice.number}</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Update invoice details</p>
        </div>
        <a href={`/invoices/${invoice._id.toString()}`} className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] px-4 py-2 text-sm font-medium text-slate-700 dark:text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
          Cancel
        </a>
      </div>

      <EditInvoiceForm invoice={invoice} clients={clients} />
    </div>
  )
}

function EditInvoiceForm({ invoice, clients }: { invoice: any; clients: any[] }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-6 bg-white dark:bg-[var(--card)]">
      <form action={`/api/invoices/${invoice._id.toString()}/update?returnTo=/invoices/${invoice._id.toString()}`} method="POST">
        <input type="hidden" name="id" value={invoice._id.toString()} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="clientId" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Client *</label>
            <select
              name="clientId"
              defaultValue={invoice.clientId?.toString() || ""}
              required
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Status *</label>
            <select
              name="status"
              defaultValue={invoice.status}
              required
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="total" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Total Amount *</label>
            <input
              id="total"
              name="total"
              type="number"
              step="0.01"
              min="0"
              defaultValue={invoice.total || 0}
              required
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Due Date</label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ""}
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="notes" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Notes</label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={invoice.notes || ""}
              placeholder="Additional notes..."
              rows={3}
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Update Invoice
          </button>
        </div>
      </form>
    </div>
  )
}
