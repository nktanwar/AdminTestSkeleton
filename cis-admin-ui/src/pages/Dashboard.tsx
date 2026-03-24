import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  ApiError,
  ChannelAPI,
  DashboardAPI,
  type DashboardDealerPerformanceEntry,
  type DashboardRecentFunnel,
  type DashboardResponse,
  type DashboardSalesLeaderboardEntry,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import type { DecodedActor } from "../lib/jwt"
import { canViewFunnels } from "../lib/access"

const EMPTY_DASHBOARD: DashboardResponse = {
  summary: {
    totalLeads: 0,
    conversionRate: 0,
  },
  salesLeaderboard: [],
  dealerPerformance: [],
  recentFunnels: [],
  dealerCount: 0,
}

function PermissionPanel({ actor }: { actor: DecodedActor }) {
  const hasFullAccess =
    actor.type === "ADMIN" ||
    (actor.permissionCodes?.includes("ADMIN_OVERRIDE") ?? false)

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Your Permissions</h3>
        {hasFullAccess && (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            Full access
          </span>
        )}
      </div>

      {hasFullAccess ? (
        <p className="text-sm text-[var(--text-muted)]">
          This session has full dashboard visibility for the selected channel.
        </p>
      ) : actor.permissionCodes && actor.permissionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actor.permissionCodes.map((permissionCode) => (
            <span
              key={permissionCode}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1 text-xs text-[var(--text-soft)]"
            >
              {permissionCode}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">No permissions assigned</p>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{subtitle}</p>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-muted)]">
      {message}
    </div>
  )
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Not authorized to view dashboard data for this channel."
  }

  if (error instanceof Error) return error.message
  return "Failed to load dashboard"
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  return new Date(timestamp).toLocaleString()
}

function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "0.0%"
  return value.toFixed(1) + "%"
}

function LeaderboardTable({
  rows,
}: {
  rows: DashboardSalesLeaderboardEntry[]
}) {
  if (rows.length === 0) {
    return <EmptyState message="No performance data available yet." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Sales Person</th>
            <th className="px-4 py-3 text-left font-medium">Assigned Leads</th>
            <th className="px-4 py-3 text-left font-medium">Converted</th>
            <th className="px-4 py-3 text-left font-medium">Conversion %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-[var(--border)]">
              <td className="px-4 py-4 font-medium">{row.name}</td>
              <td className="px-4 py-4">{row.assignedLeads}</td>
              <td className="px-4 py-4">{row.converted}</td>
              <td className="px-4 py-4 text-[var(--accent)]">{formatRate(row.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DealerPerformanceTable({
  rows,
}: {
  rows: DashboardDealerPerformanceEntry[]
}) {
  if (rows.length === 0) {
    return <EmptyState message="No dealers are active in this channel yet." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Dealer Name</th>
            <th className="px-4 py-3 text-left font-medium">Leads</th>
            <th className="px-4 py-3 text-left font-medium">Converted</th>
            <th className="px-4 py-3 text-left font-medium">Conversion %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-[var(--border)]">
              <td className="px-4 py-4 font-medium">{row.name}</td>
              <td className="px-4 py-4">{row.leads}</td>
              <td className="px-4 py-4">{row.converted}</td>
              <td className="px-4 py-4 text-[var(--accent)]">{formatRate(row.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecentFunnelsList({
  funnels,
  canOpenFunnels,
  onOpen,
}: {
  funnels: DashboardRecentFunnel[]
  canOpenFunnels: boolean
  onOpen: (funnelId: string) => void
}) {
  if (funnels.length === 0) {
    return <EmptyState message="No funnels created for this channel yet." />
  }

  return (
    <div className="space-y-3">
      {funnels.map((funnel) => {
        const cardClassName = canOpenFunnels
          ? "cursor-pointer hover:bg-[var(--accent-soft)]"
          : "opacity-95"

        return (
          <button
            key={funnel.id}
            type="button"
            onClick={() => onOpen(funnel.id)}
            disabled={!canOpenFunnels}
            className={
              "flex w-full items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4 text-left transition disabled:cursor-default " +
              cardClassName
            }
          >
            <div>
              <p className="font-medium">{funnel.name}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)] font-mono">{funnel.id}</p>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{formatDate(funnel.createdAt)}</p>
          </button>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { actor, selectedChannelId, isAdmin, permissions } = useAuth()
  const navigate = useNavigate()
  const canViewFunnelsInChannel = canViewFunnels(isAdmin, permissions)
  const canCreateFunnel =
    isAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    permissions.includes("CREATE_FUNNEL")

  const activeChannelQuery = useQuery({
    queryKey: ["channel", selectedChannelId],
    queryFn: () => ChannelAPI.get(selectedChannelId!),
    enabled: !!selectedChannelId,
  })

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", selectedChannelId],
    queryFn: () => DashboardAPI.get(selectedChannelId!),
    enabled: !!selectedChannelId,
  })

  if (!actor) {
    return <div>Please log in</div>
  }

  const channelName =
    activeChannelQuery.data?.name ?? selectedChannelId ?? "selected channel"
  const dashboard = dashboardQuery.data ?? EMPTY_DASHBOARD
  const personalPerformance = dashboard.salesLeaderboard[0] ?? null
  const metricCards = isAdmin
    ? [
        {
          label: "Total Leads",
          value: String(dashboard.summary.totalLeads),
          subtitle: "All visible leads in this channel",
        },
        {
          label: "Conversion Rate",
          value: formatRate(dashboard.summary.conversionRate),
          subtitle: "Closed leads across the channel",
        },
        {
          label: "Recent Funnels",
          value: String(dashboard.recentFunnels.length),
          subtitle: "Latest funnel entries returned by the API",
        },
        {
          label: "Dealers",
          value: String(dashboard.dealerCount),
          subtitle: "Active external members in this channel",
        },
      ]
    : [
        {
          label: "My Leads",
          value: String(dashboard.summary.totalLeads),
          subtitle: "Visible only to your membership",
        },
        {
          label: "My Conversion Rate",
          value: formatRate(dashboard.summary.conversionRate),
          subtitle: "Closed leads from your assigned work",
        },
        {
          label: "Closed Leads",
          value: String(personalPerformance?.converted ?? 0),
          subtitle: "From your performance snapshot",
        },
        {
          label: "Recent Funnels",
          value: String(dashboard.recentFunnels.length),
          subtitle: "Latest channel funnels shared by the API",
        },
      ]

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,20,27,0.92))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[var(--text-soft)]">
              {isAdmin ? "ADMIN DASHBOARD" : "MEMBER DASHBOARD"}
            </span>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                {isAdmin ? "Channel command center" : "Your channel workspace"}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {selectedChannelId
                  ? (isAdmin
                      ? "Full-channel metrics for "
                      : "Membership-scoped metrics for ") + channelName + "."
                  : "Select a channel to load dashboard data."}
              </p>
            </div>
          </div>

          {selectedChannelId && canCreateFunnel && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/channels/" + selectedChannelId + "/funnels/new"
                )
              }
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              + Create Funnel
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              subtitle={card.subtitle}
            />
          ))}
        </div>
      </section>

      {!selectedChannelId && (
        <SectionCard
          title="Channel Required"
          subtitle="Dashboard data is channel-scoped by the backend."
        >
          <EmptyState message="Pick a channel from your active session to continue." />
        </SectionCard>
      )}

      {selectedChannelId && dashboardQuery.isLoading && (
        <SectionCard
          title="Loading Dashboard"
          subtitle="Fetching the latest dashboard response from the backend."
        >
          <EmptyState message="Loading channel metrics..." />
        </SectionCard>
      )}

      {selectedChannelId && dashboardQuery.error && (
        <SectionCard title="Dashboard Error">
          <EmptyState message={toErrorMessage(dashboardQuery.error)} />
        </SectionCard>
      )}

      {selectedChannelId && !dashboardQuery.isLoading && !dashboardQuery.error && (
        <>
          {isAdmin ? (
            <SectionCard
              title="Dealer Performance"
              subtitle="Dealer analytics are currently placeholder values from the backend, so this section should be treated as a directory-style snapshot."
            >
              <DealerPerformanceTable rows={dashboard.dealerPerformance} />
            </SectionCard>
          ) : (
            <SectionCard
              title="Your Performance"
              subtitle="This section is expected to be scoped by the backend to your channel membership."
            >
              <LeaderboardTable rows={dashboard.salesLeaderboard} />
            </SectionCard>
          )}

          {isAdmin && (
            <SectionCard
              title="Sales Team Leaderboard"
              subtitle="Grouped by lead owner membership inside the selected channel."
            >
              <LeaderboardTable rows={dashboard.salesLeaderboard} />
            </SectionCard>
          )}

          <SectionCard
            title="Recent Funnels"
            subtitle={
              canViewFunnelsInChannel
                ? "Latest five funnels sorted by creation time."
                : "Latest five funnels from the dashboard response. Full funnel navigation is disabled for your role."
            }
          >
            <RecentFunnelsList
              funnels={dashboard.recentFunnels}
              canOpenFunnels={canViewFunnelsInChannel}
              onOpen={(funnelId) =>
                navigate(
                  "/channels/" + selectedChannelId + "/funnels/" + funnelId
                )
              }
            />
          </SectionCard>
        </>
      )}

      <PermissionPanel actor={actor} />
    </div>
  )
}
