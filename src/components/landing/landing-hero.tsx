import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Users, Briefcase, DollarSign, TrendingUp } from "lucide-react"
import { LandingRevenueChart } from "./landing-revenue-chart"
import { KPICard } from "@/app/dashboard/kpi-cards"

export function LandingHero() {
  return (
    <section id="hero" className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column — copy */}
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              The workspace built for agencies
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Run your agency.
              <br />
              <span className="text-primary">Manage every relationship.</span>
              <br />
              Deliver every project.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
              ClientFlow brings clients, leads, projects, tasks, invoices and business
              insights together in one organized workspace — so your agency can focus on
              delivering great work.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="group">
                <Link href="/sign-in?demo=1">
                  Explore Live Demo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                No credit card required
              </span>
              <span>Free demo account</span>
            </div>
          </div>

          {/* Right column — product preview card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-2xl -z-10" />
            <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-destructive/60" />
                  <span className="w-3 h-3 rounded-full bg-warning/60" />
                  <span className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <span className="ml-3 text-xs text-muted-foreground font-mone">
                  clientflow.app/dashboard
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="min-w-0 h-full">
                    <KPICard
                      icon={<Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                      iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                      iconSizeClass="w-7 h-7"
                      labelClass="text-xs"
                      valueClass="text-sm whitespace-nowrap"
                      contentClass="p-3"
                      value={8}
                      label="Active Clients"
                      format="number"
                    />
                  </div>
                  <div className="min-w-0 h-full">
                    <KPICard
                      icon={<Briefcase className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                      iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
                      iconSizeClass="w-7 h-7"
                      labelClass="text-xs"
                      valueClass="text-sm whitespace-nowrap"
                      contentClass="p-3"
                      value={6}
                      label="Active Projects"
                      format="number"
                    />
                  </div>
                  <div className="min-w-0 h-full">
                    <KPICard
                      icon={<DollarSign className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                      iconBgClass="bg-amber-100 dark:bg-amber-900/30"
                      iconSizeClass="w-7 h-7"
                      labelClass="text-xs"
                      valueClass="text-sm whitespace-nowrap"
                      contentClass="p-3"
                      value={31000}
                      label="Outstanding"
                    />
                  </div>
                  <div className="min-w-0 h-full">
                    <KPICard
                      icon={<TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                      iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
                      iconSizeClass="w-7 h-7"
                      labelClass="text-xs"
                      valueClass="text-sm whitespace-nowrap"
                      contentClass="p-3"
                      value={38200}
                      label="Revenue This Month"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Revenue Analytics</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Last 7 months</span>
                </div>
                <LandingRevenueChart />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}