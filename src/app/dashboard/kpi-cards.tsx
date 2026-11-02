"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

interface KPICardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  trend?: {
    value: number
    label: string
  }
  iconBgClass: string
  iconSizeClass?: string
  labelClass?: string
  valueClass?: string
  contentClass?: string
  format?: "currency" | "number"
}

export function KPICard({
  icon,
  value,
  label,
  trend,
  iconBgClass,
  iconSizeClass,
  labelClass,
  valueClass,
  contentClass,
  format = "currency",
}: KPICardProps) {
  const displayValue =
    typeof value === "number"
      ? format === "currency"
        ? formatCurrency(value)
        : value.toLocaleString()
      : value

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className={cn("p-5", contentClass)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-slate-500 dark:text-slate-400", labelClass)}>
              {label}
            </p>
            <p className={cn("mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50", valueClass)}>
              {displayValue}
            </p>
            {trend && (
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.value >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex-shrink-0 rounded-xl flex items-center justify-center",
              iconSizeClass || "w-10 h-10",
              iconBgClass
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}