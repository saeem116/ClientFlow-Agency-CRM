import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 overflow-hidden">
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
              <div className="p-5">
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Clients", value: "8", color: "bg-blue-500" },
                    { label: "Projects", value: "6", color: "bg-indigo-500" },
                    { label: "Outstanding", value: "$31K", color: "bg-amber-500" },
                    { label: "Revenue", value: "$42K", color: "bg-emerald-500" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${kpi.color}`} />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {kpi.label}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-foreground">{kpi.value}</div>
                    </div>
                  ))}
                </div>
                <div className="h-32 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-4 flex items-end justify-between p-3">
                  {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-6 rounded-sm bg-primary/70"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {["J", "F", "M", "A", "M", "J", "J"][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">TechStart Website Redesign</span>
                    <span className="font-medium text-foreground">Active</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-3/4 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}