import { useQuery } from "@tanstack/react-query"
import {
  DealerAPI,
  type DealerDashboardSummary,
} from "../lib/api"

const CARDS: Array<{
  key: keyof DealerDashboardSummary
  label: string
  suffix?: string
}> = [
  { key: "assignedLeads", label: "Assigned Leads" },
  { key: "activeLeads", label: "Active Leads" },
  { key: "closedLeads", label: "Closed Leads" },
  { key: "accessibleChannels", label: "Channels" },
  {
    key: "accessibleKnowledgeCenters",
    label: "Knowledge Centers",
  },
  { key: "conversionRate", label: "Conversion Rate", suffix: "%" },
]

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string
  value: number
  suffix?: string
}) {
  const displayValue = suffix
    ? `${value.toFixed(2)}${suffix}`
    : value.toLocaleString()

  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-5 text-4xl font-semibold tracking-tight">
        {displayValue}
      </p>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Live value returned for the signed-in dealer.
      </p>
    </article>
  )
}

function LoadingCard() {
  return (
    <div className="h-36 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]" />
  )
}

export default function DealerDashboard() {
  const summaryQuery = useQuery({
    queryKey: ["dealer-dashboard-summary"],
    queryFn: DealerAPI.getDashboardSummary,
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(120,53,15,0.96),rgba(28,25,23,0.92))] p-8 shadow-[var(--shadow-panel)]">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">
          Dealer Dashboard
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Your lead pipeline and access footprint
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-100/75">
          This overview is already filtered by backend membership and ownership
          rules, so it only reflects channels, knowledge centers, and leads you
          can actually work with.
        </p>
      </section>

      {summaryQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
      )}

      {summaryQuery.error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : "Failed to load dealer dashboard."}
        </div>
      )}

      {summaryQuery.data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CARDS.map((card) => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={summaryQuery.data[card.key]}
              suffix={card.suffix}
            />
          ))}
        </div>
      )}
    </div>
  )
}
