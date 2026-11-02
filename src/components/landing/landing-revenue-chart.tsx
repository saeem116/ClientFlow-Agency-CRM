"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", revenue: 18400 },
  { month: "Feb", revenue: 24800 },
  { month: "Mar", revenue: 21200 },
  { month: "Apr", revenue: 31600 },
  { month: "May", revenue: 28900 },
  { month: "Jun", revenue: 38200 },
  { month: "Jul", revenue: 34100 },
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) {
  if (active && payload && payload.length > 0) {
    return (
      <div className="rounded-md bg-card border border-border px-2.5 py-1.5 shadow-lg">
        <p className="text-xs text-muted-foreground">{payload[0].name}</p>
        <p className="text-sm font-semibold text-foreground">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export function LandingRevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={128}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="landing-revenue-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: "none" }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#landing-revenue-gradient)"
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}