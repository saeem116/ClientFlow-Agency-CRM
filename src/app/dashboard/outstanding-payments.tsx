"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Invoice {
  id: string
  number: string
  status: string
  total: number
  paidAmount: number
  dueDate: Date | string | null
  client: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
  } | null
}

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "warning" | "info" | "success" }> = {
  SENT: { label: "Sent", variant: "info" },
  PARTIALLY_PAID: { label: "Partial", variant: "warning" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  DRAFT: { label: "Draft", variant: "default" },
  PAID: { label: "Paid", variant: "success" },
  VOIDED: { label: "Voided", variant: "default" },
}

interface OutstandingPaymentsProps {
  invoices: Invoice[]
}

export function OutstandingPayments({ invoices }: OutstandingPaymentsProps) {
  const outstandingInvoices = invoices
    .filter((inv) => ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status))
    .sort((a, b) => {
      // Overdue first, then by due date
      const aOverdue = a.status === "OVERDUE"
      const bOverdue = b.status === "OVERDUE"
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Outstanding Payments</CardTitle>
        <Link
          href="/invoices"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {outstandingInvoices.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            No outstanding payments
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    Invoice #
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    Client
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    Due Date
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outstandingInvoices.slice(0, 5).map((invoice) => {
                  const outstanding = Number(invoice.total) - Number(invoice.paidAmount)
                  const statusCfg = statusConfig[invoice.status] || statusConfig.DRAFT
                  const isOverdue = invoice.status === "OVERDUE" || (invoice.dueDate && new Date(invoice.dueDate) < new Date())

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-mono font-medium text-slate-900 dark:text-slate-100 hover:text-primary transition-colors"
                        >
                          {invoice.number}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        {invoice.client ? (
                          <Link
                            href={`/clients/${invoice.client.id}`}
                            className="text-slate-900 dark:text-slate-100 hover:text-primary transition-colors"
                          >
                            {invoice.client.companyName || `${invoice.client.firstName || ""} ${invoice.client.lastName || ""}`.trim()}
                          </Link>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(outstanding)}
                      </td>
                      <td className="py-3 px-3">
                        {invoice.dueDate ? (
                          <span className={cn(
                            isOverdue && "text-red-600 dark:text-red-400 font-medium",
                            !isOverdue && "text-slate-500 dark:text-slate-400"
                          )}>
                            {formatDate(invoice.dueDate)}
                            {isOverdue && " (Overdue)"}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {outstandingInvoices.length > 5 && (
          <div className="mt-4 text-center">
            <Link
              href="/invoices"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all {outstandingInvoices.length} outstanding invoices →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}