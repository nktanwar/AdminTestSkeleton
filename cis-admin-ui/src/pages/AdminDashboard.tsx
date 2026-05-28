import { useQuery } from "@tanstack/react-query"
import { AdminAPI, type AdminDashboardSummary } from "../lib/api"

const DASHBOARD_CARDS: Array<{
  key: keyof AdminDashboardSummary
  label: string
  accent: string
}> = [
  {
    key: "totalUsers",
    label: "Total Users",
    accent: "text-sky-300",
  },
  {
    key: "totalChannels",
    label: "Total Channels",
    accent: "text-amber-300",
  },
  {
    key: "totalKnowledgeCenters",
    label: "Knowledge Centers",
    accent: "text-emerald-300",
  },
  {
    key: "totalKnowledgeItems",
    label: "Knowledge Items",
    accent: "text-fuchsia-300",
  },
  {
    key: "activeLeads",
    label: "Active Leads",
    accent: "text-orange-300",
  },
  {
    key: "closedLeads",
    label: "Closed Leads",
    accent: "text-rose-300",
  },
]

function MetricSkeleton() {
  return (
    <div className="h-36 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]" />
  )
}

function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: number
  note: string
  accent: string
}) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className={"mt-5 text-4xl font-semibold tracking-tight " + accent}>
        {value.toLocaleString()}
      </p>
      <p className="mt-3 text-sm text-[var(--text-muted)]">{note}</p>
    </article>
  )
}

export default function AdminDashboard() {
  const summaryQuery = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: () => AdminAPI.getDashboardSummary(),
  })

  const data = summaryQuery.data

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(8,47,73,0.95),rgba(28,25,23,0.92))] p-8 shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200/80">
              Allison Homes Admin
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Operational snapshot for the internal team
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-sky-100/75">
              Monitor users, channels, knowledge coverage, and lead movement
              from one role-protected dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-sky-100/80 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.2em]">Channels</div>
              <div className="mt-2 text-xl font-semibold">
                {data?.activeChannels ?? 0}/{data?.totalChannels ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.2em]">Knowledge</div>
              <div className="mt-2 text-xl font-semibold">
                {data?.activeKnowledgeCenters ?? 0}/{data?.totalKnowledgeCenters ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.2em]">Leads</div>
              <div className="mt-2 text-xl font-semibold">
                {data?.totalLeads ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      {summaryQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <MetricSkeleton key={index} />
          ))}
        </div>
      )}

      {summaryQuery.error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : "Failed to load dashboard summary."}
        </div>
      )}

      {data && !summaryQuery.isLoading && !summaryQuery.error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DASHBOARD_CARDS.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={data[card.key]}
                accent={card.accent}
                note={
                  card.key === "activeLeads"
                    ? `${data.totalLeads.toLocaleString()} total leads in pipeline`
                    : card.key === "closedLeads"
                      ? `${data.closedLeads.toLocaleString()} resolved opportunities`
                      : "Live value from the admin summary endpoint"
                }
              />
            ))}
          </div>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Channel Health</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {data.activeChannels} of {data.totalChannels} channels are active.
              </p>
            </article>
            <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Knowledge Coverage</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {data.activeKnowledgeCenters} active centers holding {data.totalKnowledgeItems} items.
              </p>
            </article>
            <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Lead Mix</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {data.activeLeads} active and {data.closedLeads} closed leads right now.
              </p>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
