const audiences = [
  {
    name: "Digital agencies",
    description: "Manage multiple clients, projects, and team members across concurrent engagements.",
  },
  {
    name: "Creative studios",
    description: "Track creative projects from brief to delivery with milestones and asset management.",
  },
  {
    name: "Web development agencies",
    description: "Organize development sprints, track bugs as tasks, and invoice by milestone or retainer.",
  },
  {
    name: "Marketing teams",
    description: "Pipeline management for campaigns, content calendars as projects, and ROI tracking.",
  },
  {
    name: "Freelancers managing multiple clients",
    description: "Single workspace for all clients &mdash; invoices, tasks, and communication in one place.",
  },
  {
    name: "Small service businesses",
    description: "Professional client management without enterprise complexity or cost.",
  },
]

export function WhoItFor() {
  return (
    <section id="who-it-for" className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Who It&apos;s For
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Built for service businesses that bill for expertise
          </h2>
          <p className="text-lg text-muted-foreground">
            If you manage client relationships, deliver projects, and invoice for your work — ClientFlow is for you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((audience, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">{audience.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{audience.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}