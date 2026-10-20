"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatCompactCurrency } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useTheme } from "@/components/providers/theme-provider"

interface RevenueDataPoint {
  month: string
  revenue: number
}

interface RevenueChartProps {
  data: RevenueDataPoint[]
}

type DateRange = { key: string; label: string; months: number }

const dateRanges: DateRange[] = [
  { key: "30d", label: "Last 30 days", months: 1 },
  { key: "90d", label: "Last 90 days", months: 3 },
  { key: "6m", label: "Last 6 months", months: 6 },
]

// Theme-aware color sets
const chartColors = {
  light: {
    grid: "#e2e8f0",      // slate-200
    axis: "#64748b",      // slate-500
    line: "#4f46e5",      // primary
    lineDark: "#4338ca",  // primary/80
    areaTop: "rgba(79, 70, 229, 0.25)",
    areaBottom: "rgba(79, 70, 229, 0.02)",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0f172a",
    tooltipSubtext: "#64748b",
    buttonInactiveText: "#64748b",
    buttonHoverText: "#0f172a",
  },
  dark: {
    grid: "#334155",      // slate-700
    axis: "#cbd5e1",      // slate-300
    line: "#818cf8",      // light indigo
    lineDark: "#a78bfa",  // lighter indigo
    areaTop: "rgba(129, 141, 247, 0.25)",
    areaBottom: "rgba(129, 141, 247, 0.02)",
    tooltipBg: "#111827",  // slate-900
    tooltipBorder: "#334155", // slate-700
    tooltipText: "#f1f5f9",
    tooltipSubtext: "#94a3b8",
    buttonInactiveText: "#94a3b8",
    buttonHoverText: "#f1f5f9",
  },
}

function CustomTooltip({ active, payload, theme }: { active?: boolean; payload?: Array<{ value: number; name: string }>; theme: keyof typeof chartColors }) {
  if (active && payload && payload.length > 0) {
    const colors = chartColors[theme]
    return (
      <div
        className="rounded-lg shadow-lg p-3"
        style={{
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          border: `1px solid ${colors.tooltipBorder}`,
        }}
      >
        <p className="text-sm font-medium" style={{ color: colors.tooltipText }}>
          {payload[0].name}
        </p>
        <p className="text-lg font-semibold" style={{ color: colors.tooltipText }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export function RevenueChart({ data: initialData }: RevenueChartProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>(dateRanges[2])
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const theme = mounted ? resolvedTheme : "light"
  const colors = chartColors[theme]

  // Filter data based on selected range
  const filteredData = initialData.slice(-selectedRange.months)

  Math.max(...filteredData.map((d) => d.revenue), 1)

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-")
    const date = new Date(Number(year), Number(monthNum) - 1)
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  }

  return (
    <Card className="h-full" data-chart-theme>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Revenue Analytics</CardTitle>
        <div className="flex items-center gap-1">
          {dateRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => setSelectedRange(range)}
              className="px-2.5 py-1 text-xs rounded-md transition-colors"
              style={
                selectedRange.key === range.key
                  ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                  : {
                      color: colors.buttonInactiveText,
                    }
              }
              onMouseEnter={(e) => {
                if (selectedRange.key !== range.key) {
                  e.currentTarget.style.color = colors.buttonHoverText
                  e.currentTarget.style.backgroundColor = theme === "dark" ? "#1e293b" : "#f1f5f9"
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRange.key !== range.key) {
                  e.currentTarget.style.color = colors.buttonInactiveText
                  e.currentTarget.style.backgroundColor = "transparent"
                }
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.line} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colors.line} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.grid}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: colors.axis }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatMonth}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: colors.axis }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => formatCompactCurrency(value)}
                width={50}
              />
              <Tooltip
                content={<CustomTooltip theme={theme} />}
                wrapperStyle={{ outline: "none" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={colors.line}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#revenue-gradient)"
                dot={{ fill: colors.line, strokeWidth: 2, r: 4 }}
                activeDot={{ fill: colors.lineDark, strokeWidth: 2, r: 5, stroke: colors.line }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: theme === "dark" ? colors.tooltipSubtext : "#64748b" }}>
          <span>
            Total:{" "}
            <span className="font-semibold" style={{ color: colors.tooltipText }}>
              {formatCurrency(filteredData.reduce((sum, d) => sum + d.revenue, 0))}
            </span>
          </span>
          <span>
            Avg/Month:{" "}
            <span className="font-semibold" style={{ color: colors.tooltipText }}>
              {formatCurrency(filteredData.reduce((sum, d) => sum + d.revenue, 0) / filteredData.length || 0)}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}