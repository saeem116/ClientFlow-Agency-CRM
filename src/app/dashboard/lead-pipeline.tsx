import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCompactCurrency } from "@/lib/utils"
import Link from "next/link"
import { cn } from "@/lib/utils"

const stagesConfig: Array<{ key: string; label: string; color: string; bgColor: string }> = [
  { key: "NEW", label: "New", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "CONTACTED", label: "Contacted", color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  { key: "QUALIFIED", label: "Qualified", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  { key: "PROPOSAL_SENT", label: "Proposal", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  { key: "WON", label: "Won", color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  { key: "LOST", label: "Lost", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
]

interface LeadPipelineProps {
  data: Record<string, { count: number; totalValue: number }>
}

export function LeadPipeline({ data }: LeadPipelineProps) {
  const totalDeals = Object.values(data).reduce((sum, s) => sum + s.count, 0)
  const totalValue = Object.values(data).reduce((sum, s) => sum + s.totalValue, 0)

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Lead Pipeline</CardTitle>
        <Link
          href="/leads"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {stagesConfig.map((stage) => {
            const stageData = data[stage.key] || { count: 0, totalValue: 0 }
            const percentage = totalDeals > 0 ? (stageData.count / totalDeals) * 100 : 0

            return (
              <div key={stage.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${stage.bgColor}`}
                    />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {stage.label}
                    </span>
                    <span className={cn("font-semibold", stage.color)}>
                      {stageData.count}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {formatCompactCurrency(stageData.totalValue)}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stage.bgColor}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Total: <span className="font-semibold text-slate-900 dark:text-slate-100">{totalDeals}</span> deals
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(totalValue)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}