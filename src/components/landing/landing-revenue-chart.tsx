"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency, formatCompactCurrency } from "@/lib/utils"
import { useTheme } from "@/components/providers/theme-provider"

const data = [
  { month: "2026-01", revenue: 18400 },
  { month: "2026-02", revenue: 24800 },
  { month: "2026-03", revenue: 21200 },
  { month: "2026-04", revenue: 31600 },
  { month: "2026-05", revenue: 28900 },
  { month: "2026-06", revenue: 38200 },
  { month: "2026-07", revenue: 34100 },
]

function CustomTooltip({ active, payload, theme }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  theme: "light" | "dark"
}) {
  if (active && payload && payload.length > 0) {
    const colors = chartColors[theme]
    return (
      <div
        className="rounded-lg shadow-lg p-3 border"
        style={{
          backgroundColor: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
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

const chartColors = {
  light: {
    grid: "#e2e8f0",
    axis: "#64748b",
    line: "#4f46e5",
    lineDark: "#4338ca",
    areaTop: "rgba(79, 70, 229, 0.25)",
    areaBottom: "rgba(79, 70, 229, 0.02)",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e2e8f0",
    tooltipText: "#0f172a",
  },
  dark: {
    grid: "#334155",
    axis: "#cbd5e1",
    line: "#818cf8",
    lineDark: "#a78bfa",
    areaTop: "rgba(129, 141, 247, 0.25)",
    areaBottom: "rgba(129, 141, 247, 0.02)",
    tooltipBg: "#111827",
    tooltipBorder: "#334155",
    tooltipText: "#f1f5f9",
  },
}

function formatMonth(month: string) {
  const [year, monthNum] = month.split("-")
  const date = new Date(Number(year), Number(monthNum) - 1)
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

export function LandingRevenueChart() {
  const { resolvedTheme } = useTheme()
  const theme: "light" | "dark" = resolvedTheme || "light"
  const colors = chartColors[theme]

  return (
    <>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="landing-revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.areaTop} />
              <stop offset="95%" stopColor={colors.areaBottom} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: colors.axis }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatMonth}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: colors.axis }}
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
            fill="url(#landing-revenue-gradient)"
            dot={{ fill: colors.line, strokeWidth: 2, r: 4 }}
            activeDot={{ fill: colors.lineDark, strokeWidth: 2, r: 5, stroke: colors.line }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* Summary row below chart */}
      <div className="flex items-center justify-between text-xs mt-2" style={{ color: colors.axis }}>
        <span>
          Total:{" "}
          <span className="font-semibold" style={{ color: colors.tooltipText }}>
            {formatCurrency(data.reduce((s, d) => s + d.revenue, 0))}
          </span>
        </span>
        <span>
          Avg/mo:{" "}
          <span className="font-semibold" style={{ color: colors.tooltipText }}>
            {formatCurrency(data.reduce((s, d) => s + d.revenue, 0) / data.length)}
          </span>
        </span>
      </div>
    </>
  )
}