"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Search, DollarSign, Users, TrendingUp, Mail, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST"

interface Lead {
  id: string
  title: string
  email?: string | null
  stage: LeadStage
  value?: number | null
  source?: string | null
  followUpAt?: Date | string | null
  client?: { id: string; name: string } | null
}

const stages: { key: LeadStage; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key: "NEW", label: "New", icon: <Users className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-100" },
  { key: "CONTACTED", label: "Contacted", icon: <Mail className="h-4 w-4" />, color: "text-violet-600", bg: "bg-violet-100" },
  { key: "QUALIFIED", label: "Qualified", icon: <TrendingUp className="h-4 w-4" />, color: "text-indigo-600", bg: "bg-indigo-100" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", icon: <DollarSign className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-100" },
  { key: "WON", label: "Won", icon: <CheckCircle className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "LOST", label: "Lost", icon: <XCircle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-100" },
]

interface LeadsPageClientProps {
  leads: Lead[]
}

export function LeadsPageClient({ leads }: LeadsPageClientProps) {
  const [search, setSearch] = useState("")

  const filteredLeads = leads.filter((lead) =>
    lead.title.toLowerCase().includes(search.toLowerCase()) ||
    lead.email?.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = stages.reduce(
    (acc, s) => {
      acc[s.key] = filteredLeads.filter((l) => l.stage === s.key)
      return acc
    },
    {} as Record<LeadStage, Lead[]>
  )

  const totalValue = stages.reduce((sum, s) => {
    const stageLeads = grouped[s.key]
    return sum + stageLeads.reduce((s2, l) => s2 + (l.value || 0), 0)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Leads</h1>
          <p className="text-slate-500 dark:text-[var(--muted-foreground)] mt-1">Track and manage your sales pipeline</p>
        </div>
        <Button asChild>
          <Link href="/leads/new">
            <Plus className="mr-2 h-4 w-4" /> New Lead
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[var(--input)] border border-slate-200 dark:border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button variant="outline">Filter</Button>
      </div>

      {/* Pipeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stages.map((stage) => {
              const stageLeads = grouped[stage.key]
              const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0)
              return (
                <div
                  key={stage.key}
                  className={`p-4 rounded-lg border ${stage.bg} dark:${stage.bg.replace("100", "900/30")}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${stage.color}`}>{stage.icon} {stage.label}</span>
                    <span className="font-semibold text-[var(--foreground)]">{stageLeads.length}</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {formatCurrency(stageValue)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[var(--border)] flex justify-between text-sm">
            <span className="text-slate-600 dark:text-[var(--muted-foreground)]">Total Pipeline Value</span>
            <span className="font-semibold text-[var(--foreground)]">{formatCurrency(totalValue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <Card>
        <CardHeader>
          <CardTitle>Kanban Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageLeads = grouped[stage.key]
              return (
                <div
                  key={stage.key}
                  className="min-w-[280px] max-w-[280px] flex flex-col"
                >
                  <div className={`flex items-center justify-between mb-3 px-1 ${stage.bg} dark:${stage.bg.replace("100", "900/30")} rounded-lg`}>
                    <div className="flex items-center gap-2">
                      <span className={stage.color}>{stage.icon}</span>
                      <span className="font-medium text-[var(--foreground)]">{stage.label}</span>
                    </div>
                    <span className={`bg-white/80 dark:bg-[var(--muted)] px-2 py-0.5 rounded text-sm font-medium ${stage.color}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="space-y-3 flex-1 min-h-[200px]">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white dark:bg-[var(--card)] border border-slate-200 dark:border-[var(--border)] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <h4 className="font-medium text-[var(--foreground)] mb-1">{lead.title}</h4>
                        {lead.email && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{lead.email}</p>
                        )}
                        {lead.client && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                            Client: {lead.client.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs">
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
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center text-slate-400 py-8 text-sm">
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}