const steps = [
  {
    number: "01",
    title: "Organize",
    description: "Add clients, manage leads, and create projects in minutes.",
    details: [
      "Import or manually add client details",
      "Track leads through customizable pipeline stages",
      "Create projects with budgets, timelines, and milestones",
    ],
  },
  {
    number: "02",
    title: "Collaborate",
    description: "Assign tasks, coordinate milestones, and track progress visually.",
    details: [
      "Kanban board for task flow (Backlog → Done)",
      "Assign work with priorities and due dates",
      "Milestone tracking with completion dates",
      "Team notifications keep everyone aligned",
    ],
  },
  {
    number: "03",
    title: "Grow",
    description: "Monitor invoices, payments, and business performance.",
    details: [
      "Create professional invoices with line items",
      "Record payments and track outstanding balances",
      "Dashboard KPIs and 6-month revenue trends",
      "Lead pipeline and project health at a glance",
    ],
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Three steps to an organized agency
          </h2>
          <p className="text-lg text-muted-foreground">
            No complex setup. No weeks of onboarding. Start managing your agency better today.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <article
              key={step.number}
              className="relative flex flex-col h-full"
            >
              {/* Number indicator */}
              <div className="absolute -top-4 left-6 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg z-10">
                {step.number}
              </div>

              <div className="pt-8 pb-6 px-6 border border-border bg-card rounded-2xl flex flex-col h-full">
                <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground mb-6 flex-1">{step.description}</p>
                <ul className="space-y-3">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}