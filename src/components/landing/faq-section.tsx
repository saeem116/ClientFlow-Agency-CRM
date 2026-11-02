"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const faqs = [
  {
    question: "What is ClientFlow?",
    answer:
      "ClientFlow is an agency CRM that brings clients, leads, projects, tasks, invoices, and business insights together in one organized workspace. It's built for creative agencies, development shops, marketing teams, and freelancers who manage multiple client relationships.",
  },
  {
    question: "Who should use ClientFlow?",
    answer:
      "Digital agencies, creative studios, web development agencies, marketing teams, freelancers managing multiple clients, and small service businesses. If you deliver projects for clients and need to track work, invoices, and relationships — ClientFlow is for you.",
  },
  {
    question: "Can I manage leads and clients?",
    answer:
      "Yes. ClientFlow includes a full lead pipeline (New → Contacted → Qualified → Proposal Sent → Won/Lost) with opportunity values, sources, and follow-up dates. Clients have company details, contact info, communication history, and status tracking.",
  },
  {
    question: "Can I track projects and tasks?",
    answer:
      "Yes. Projects support statuses (Draft, Active, On Hold, Completed, Cancelled), priorities, budgets, timelines, and milestones. Tasks use a Kanban board (Backlog → In Progress → In Review → Done) with assignees, priorities, and due dates.",
  },
  {
    question: "Can I manage invoices and payments?",
    answer:
      "Yes. Create professional invoices with line items, tax rates, and auto-calculated totals. Record payments, track outstanding balances, and view payment history. Invoices link to clients and projects for complete context.",
  },
  {
    question: "Can I try the live demo?",
    answer:
      "Yes. Click \"Live Demo\" in the navigation or go directly to the sign-in page. Choose \"Login as Team Member\" to explore the workspace instantly without entering credentials. The demo uses a read-only account with realistic fictional data.",
  },
  {
    question: "Does the demo account modify real data?",
    answer:
      "No. The demo account (reviewer@clientflow.test) is strictly read-only. It connects to a completely separate database (clientflow_demo) that is isolated from all production data. Every write operation is blocked at the API level — you can browse everything but cannot create, update, or delete any records. The demo data is fictional and reset periodically.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Common questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Straight answers. No marketing fluff.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group rounded-xl border border-border bg-card overflow-hidden"
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="text-lg font-medium text-foreground pr-8">{faq.question}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 transition-transform" />
                  ) : (
                    <ChevronDown className="h-5 w-5 transition-transform" />
                  )}
                </div>
              </summary>
              <div className="px-5 pb-5 pt-0 animate-in fade-in-0 duration-200">
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}