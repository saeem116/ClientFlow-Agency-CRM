import { ensureDb } from "@/lib/database"
import { getOrganization, getSession } from "@/lib/auth"
import { getModels } from "@/lib/database-scoped"
import { notFound, redirect } from "next/navigation"

export const metadata = {
  title: "Record Payment - ClientFlow",
  description: "Record a payment for an invoice",
}

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb()
  const { id } = await params

  const session = await getSession()
  const org = await getOrganization()
  if (!org || !session?.user) redirect("/sign-in")

  const models = await getModels(session)
  const Invoice = models.Invoice
  const Client = models.Client
  const Payment = models.Payment

  const invoice = await Invoice.findOne({ _id: id, organizationId: org.id }).lean() as unknown as {
    _id: { toString(): string }
    number: string
    status: string
    total?: number | null
    paidAmount?: number | null
    clientId?: { toString(): string }
  } | null
  if (!invoice) notFound()

  const client = await Client.findById(invoice.clientId).lean() as unknown as {
    _id: { toString(): string }
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
  } | null
  const clientName = client
    ? client.companyName || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed"
    : "Unknown"

  const balance = (invoice.total || 0) - (invoice.paidAmount || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">Record Payment</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">
            Invoice {invoice.number} • {clientName}
          </p>
        </div>
        <a href={`/invoices/${invoice._id.toString()}`} className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--card)] px-4 py-2 text-sm font-medium text-slate-700 dark:text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
          Cancel
        </a>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-[var(--border)] p-4 bg-white dark:bg-[var(--card)]">
        <h3 className="font-medium text-slate-900 dark:text-[var(--foreground)] mb-3">Invoice Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Total:</span>
            <span className="ml-2 font-semibold">${invoice.total?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Paid:</span>
            <span className="ml-2 font-semibold text-emerald-600">${invoice.paidAmount?.toFixed(2) || "0.00"}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-[var(--muted-foreground)]">Balance:</span>
            <span className="ml-2 font-semibold text-amber-600">${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <PaymentForm invoiceId={id} balance={balance} />
    </div>
  )
}

function PaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <form action={`/api/invoices/${invoiceId}/payment?returnTo=/invoices/${invoiceId}`} method="POST">
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Payment Amount *</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              required
              defaultValue={balance}
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="method" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Payment Method</label>
            <select
              name="method"
              defaultValue="BANK_TRANSFER"
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="PAYPAL">PayPal</option>
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="reference" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Reference</label>
            <input
              id="reference"
              name="reference"
              placeholder="Transaction ref, check #, etc."
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-slate-900 dark:text-[var(--foreground)]">Notes</label>
            <input
              id="notes"
              name="notes"
              placeholder="Optional notes"
              className="w-full rounded-md border border-slate-300 dark:border-[var(--border)] bg-white dark:bg-[var(--input)] px-3 py-2 text-sm text-slate-900 dark:text-[var(--foreground)] focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Record Payment
          </button>
        </div>
      </form>
    </div>
  )
}
