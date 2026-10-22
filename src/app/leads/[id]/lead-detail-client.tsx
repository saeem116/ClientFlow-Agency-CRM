/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Eye,
  Edit,
  Trash2,
  Loader2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Users,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

interface LeadDetailClientProps {
  lead: any
}

const stageConfig: Record<string, { variant: any; label: string }> = {
  NEW: { variant: "info", label: "New" },
  CONTACTED: { variant: "warning", label: "Contacted" },
  QUALIFIED: { variant: "success", label: "Qualified" },
  PROPOSAL_SENT: { variant: "outline", label: "Proposal Sent" },
  WON: { variant: "success", label: "Won" },
  LOST: { variant: "destructive", label: "Lost" },
}

export function LeadDetailPageClient({ lead }: LeadDetailClientProps) {
  const { isDemo } = useAuth()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stageCfg = stageConfig[lead.stage] || { variant: "secondary", label: lead.stage }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete lead")
      }
      router.push("/leads")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Lead Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-[var(--foreground)]">
                {lead.title}
              </h1>
              <Badge variant={stageCfg.variant}>{stageCfg.label}</Badge>
            </div>
            <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">
              {lead.email || "No email"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDemo && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/leads/${lead.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          )}
          <Button variant="ghost" asChild>
            <Link href="/leads">
              <Eye className="mr-2 h-4 w-4" /> Back to Leads
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Lead Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.email && (
              <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.source && (
              <div className="text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                <span className="font-medium">Source:</span> {lead.source.replace(/_/g, " ")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.value && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(lead.value)}
                </span>
              </div>
            )}
            {lead.followUpAt && (
              <div className="flex items-center gap-3 text-slate-600 dark:text-[var(--muted-foreground)]">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Follow up: {formatDate(lead.followUpAt)}</span>
              </div>
            )}
            {lead.client && (
              <div className="text-sm text-slate-600 dark:text-[var(--muted-foreground)]">
                <span className="font-medium">Associated Client:</span>{" "}
                <Link
                  href={`/clients/${lead.client.id}`}
                  className="text-primary hover:underline"
                >
                  {lead.client.name}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {lead.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-[var(--muted-foreground)]">{lead.description}</p>
          </CardContent>
        </Card>
      )}

      {lead.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-[var(--muted-foreground)]">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lead?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{lead.title}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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
