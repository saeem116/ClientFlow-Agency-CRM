"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Search, FileText, DollarSign, AlertCircle, CheckCircle2, MoreHorizontal, Trash2, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Invoice {
  id: string
  number: string
  status: string
  issueDate: Date | string
  dueDate?: Date | string | null
  total: number
  paidAmount: number
  client: { id: string; name: string }
  payments: { id: string; amount: number }[]
}

interface InvoicesPageClientProps {
  invoices: Invoice[]
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  SENT: { variant: "info", label: "Sent" },
  PARTIALLY_PAID: { variant: "warning", label: "Partially Paid" },
  PAID: { variant: "success", label: "Paid" },
  OVERDUE: { variant: "destructive", label: "Overdue" },
  VOIDED: { variant: "default", label: "Voided" },
}

export function InvoicesPageClient({ invoices }: InvoicesPageClientProps) {
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/invoices/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Failed to delete invoice")
        return
      }
      setDeleteTarget(null)
      router.refresh()
    } catch {
      alert("Failed to delete invoice. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      invoice.number.toLowerCase().includes(q) ||
      invoice.client.name.toLowerCase().includes(q) ||
      invoice.status.toLowerCase().includes(q)
    )
  })

  const totalOutstanding = filteredInvoices
    .filter((i) => i.status !== "PAID" && i.status !== "VOIDED" && i.status !== "DRAFT")
    .reduce((sum, i) => sum + (i.total - i.paidAmount), 0)
  const totalRevenue = filteredInvoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.paidAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Invoices</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Manage billing and track payments</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Outstanding</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Paid This Month</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Invoices</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{filteredInvoices.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-[var(--muted-foreground)]" />
          <input
            type="search"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[var(--input)] border border-slate-200 dark:border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button variant="outline">Filter</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-[var(--muted-foreground)]" />
              <h3 className="mt-4 text-lg font-medium text-[var(--foreground)]">
                {invoices.length === 0 ? "No invoices yet" : "No invoices found"}
              </h3>
              <p className="mt-2 text-slate-500 dark:text-[var(--muted-foreground)]">
                {invoices.length === 0
                  ? "Create your first invoice to get started."
                  : "Try adjusting your search or create a new invoice."}
              </p>
              {invoices.length === 0 && (
                <Button asChild className="mt-4">
                  <Link href="/invoices/new">
                    <Plus className="mr-2 h-4 w-4" /> Create Invoice
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[var(--border)]">
                    <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Invoice #</th>
                    <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Client</th>
                    <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Issue Date</th>
                    <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Due Date</th>
                    <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">Total</th>
                    <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">Paid</th>
                    <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">Balance</th>
                    <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                  {filteredInvoices.map((invoice) => {
                    const statusCfg = statusConfig[invoice.status] || { variant: "secondary" as const, label: invoice.status }
                    const balance = invoice.total - invoice.paidAmount
                    const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID" && invoice.status !== "VOIDED"

                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-[var(--muted)]">
                        <td className="p-4 font-mono text-sm text-[var(--foreground)]">{invoice.number}</td>
                        <td className="p-4 text-[var(--muted-foreground)]">{invoice.client.name}</td>
                        <td className="p-4 text-[var(--muted-foreground)]">{formatDate(invoice.issueDate)}</td>
                        <td className="p-4 text-[var(--muted-foreground)]">{invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</td>
                        <td className="p-4 text-right font-medium text-[var(--foreground)]">{formatCurrency(invoice.total)}</td>
                        <td className="p-4 text-right text-[var(--muted-foreground)]">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="p-4 text-right font-medium text-[var(--foreground)]">{formatCurrency(balance)}</td>
                        <td className="p-4">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="ml-1 mt-1">
                              <AlertCircle className="mr-1 h-3 w-3" /> Overdue
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/${invoice.id}`} className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive cursor-pointer focus:text-destructive"
                                onClick={() => setDeleteTarget(invoice)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.number}</strong> and all associated
              line items and payments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}