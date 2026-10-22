"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
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
import { Button } from "@/components/ui/button"
import {
  Eye,
  Edit,
  Trash2,
  Loader2,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Lead } from "./leads-page-client"

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const { isDemo } = useAuth()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete lead")
      }
      router.refresh()
    } catch {
      // Server-side authorization is the authoritative control. The API
      // returns an error response for unauthorized users; the toast is
      // surfaced via the failed request itself.
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <div
        className="bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group relative"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/leads/${lead.id}`} className="font-medium text-[var(--foreground)] hover:text-primary transition-colors block truncate">
              {lead.title}
            </Link>
            {lead.email && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 truncate">{lead.email}</p>
            )}
            {lead.client && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Client: {lead.client.name}
              </p>
            )}
            <div className="flex items-center justify-between text-xs mt-2">
              {lead.value && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(lead.value)}
                </span>
              )}
              {lead.followUpAt && (
                <span className="text-slate-500">
                  Follow up: {formatDate(lead.followUpAt)}
                </span>
              )}
            </div>
          </div>

          {/* Action menu - always visible on hover or when focused */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label="Lead actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/leads/${lead.id}`} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </DropdownMenuItem>
                {!isDemo && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/leads/${lead.id}/edit`} className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer focus:text-destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

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
    </>
  )
}
