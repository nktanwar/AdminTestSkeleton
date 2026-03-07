import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { ApiError, FunnelAPI, type FunnelSummary, DashboardMetricsAPI } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import type { DecodedActor } from "../lib/jwt"
import { MetricsCard } from "../components/MetricsCard"
import { LeadTable } from "../components/DataTable"
import {
  mockLeads,
  mockDashboardMetrics,
  mockWorkerMetrics,
  mockDealerLeaderboard,
  mockSalesLeaderboard,
} from "../mock/data"
import type { Lead } from "../types/lead"

function PermissionPanel({ actor }: { actor: DecodedActor }) {
  const hasFullAccess =
    actor.type === "ADMIN" ||
    (actor.permissionCodes?.includes("ADMIN_OVERRIDE") ?? false)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="font-semibold mb-2">Your Permissions</h3>

      {hasFullAccess ? (
        <p className="text-sm text-emerald-400 font-semibold">ALL</p>
      ) : actor.permissionCodes && actor.permissionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actor.permissionCodes.map((p) => (
            <span
              key={p}
              className="px-2 py-1 text-xs rounded bg-zinc-800"
            >
              {p}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No permissions assigned</p>
      )}
    </div>
  )
}

function AdminDashboard() {
  const { selectedChannelId } = useAuth()
  const navigate = useNavigate()

  const metricsQuery = useQuery({
    queryKey: ["metrics", "admin", selectedChannelId],
    queryFn: () =>
      DashboardMetricsAPI.getAdminMetrics(selectedChannelId),
    enabled: !!selectedChannelId,
  })

  const dealerLeaderboardQuery = useQuery({
    queryKey: ["metrics", "dealers", selectedChannelId],
    queryFn: () =>
      DashboardMetricsAPI.getDealerLeaderboard(selectedChannelId),
    enabled: !!selectedChannelId,
  })

  const salesLeaderboardQuery = useQuery({
    queryKey: ["metrics", "sales", selectedChannelId],
    queryFn: () =>
      DashboardMetricsAPI.getSalesLeaderboard(selectedChannelId),
    enabled: !!selectedChannelId,
  })

  const funnelsQuery = useQuery({
    queryKey: ["funnels", "summary", selectedChannelId],
    queryFn: () => FunnelAPI.list(selectedChannelId!),
    enabled: !!selectedChannelId,
  })

  // Use test data if API fails
  const metrics = metricsQuery.data ?? mockDashboardMetrics
  const dealers = dealerLeaderboardQuery.data ?? mockDealerLeaderboard
  const salesPeople = salesLeaderboardQuery.data ?? mockSalesLeaderboard
  const funnels = funnelsQuery.data ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricsCard
          title="Total Leads"
          value={metrics.totalLeads}
          subtitle={`${metrics.newLeadsThisWeek} new this week`}
          icon="📊"
        />
        <MetricsCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle="Overall pipeline"
          icon="📈"
        />
        <MetricsCard
          title="Active Channels"
          value={metrics.activeChannels}
          subtitle="Under management"
          icon="🔗"
        />
        <MetricsCard
          title="Dealers"
          value={metrics.dealerCount}
          subtitle="Contributing leads"
          icon="🤝"
        />
      </div>

      <button
        onClick={() =>
          selectedChannelId &&
          navigate(`/channels/${selectedChannelId}/funnels/new`)
        }
        disabled={!selectedChannelId}
        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
      >
        + Create Funnel
      </button>

      {/* Dealer Performance */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Dealer Performance</h3>
        {dealers.length === 0 ? (
          <p className="text-[var(--text-muted)]">No dealer data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Dealer Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Leads Brought</th>
                  <th className="text-left px-4 py-3 font-semibold">Converted</th>
                  <th className="text-left px-4 py-3 font-semibold">Conversion %</th>
                  <th className="text-left px-4 py-3 font-semibold">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((dealer) => (
                  <tr
                    key={dealer.dealerId}
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-subtle)] transition"
                  >
                    <td className="px-4 py-3">{dealer.dealerName}</td>
                    <td className="px-4 py-3">{dealer.leadsBrought}</td>
                    <td className="px-4 py-3">{dealer.converted}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-medium">
                        {dealer.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      ${(dealer.estimatedRevenue || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales Team Performance */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Sales Team Leaderboard</h3>
        {salesPeople.length === 0 ? (
          <p className="text-[var(--text-muted)]">No sales data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Sales Person</th>
                  <th className="text-left px-4 py-3 font-semibold">Assigned Leads</th>
                  <th className="text-left px-4 py-3 font-semibold">Converted</th>
                  <th className="text-left px-4 py-3 font-semibold">Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {salesPeople.map((person) => (
                  <tr
                    key={person.personId}
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-subtle)] transition"
                  >
                    <td className="px-4 py-3 font-medium">{person.personName}</td>
                    <td className="px-4 py-3">{person.leadsAssigned}</td>
                    <td className="px-4 py-3">{person.converted}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-medium">
                        {person.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Funnels */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Recent Funnels</h3>

        {!selectedChannelId && (
          <p className="text-sm text-[var(--text-muted)]">
            Select a channel to view funnels.
          </p>
        )}

        {selectedChannelId && funnelsQuery.isLoading && (
          <p className="text-sm text-[var(--text-muted)]">Loading funnels...</p>
        )}

        {selectedChannelId && funnelsQuery.error && (
          <p className="text-sm text-red-500">Failed to load funnels</p>
        )}

        {selectedChannelId &&
          !funnelsQuery.isLoading &&
          !funnelsQuery.error && (
            <>
              {funnels.length === 0 ? (
                <p className="text-sm text-zinc-500">No funnels created yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">ID</th>
                      <th className="text-left px-4 py-3 font-semibold">Channel</th>
                      <th className="text-left px-4 py-3 font-semibold">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnels.slice(0, 5).map((f) => (
                      <tr
                        key={f.id}
                        className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--bg-subtle)] transition"
                        onClick={() =>
                          navigate(
                            `/channels/${selectedChannelId}/funnels/${f.id}`
                          )
                        }
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {f.id.slice(-6)}
                        </td>
                        <td className="px-4 py-3">{f.channelName ?? f.channelId}</td>
                        <td className="px-4 py-3">{f.stage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
      </div>
    </div>
  )
}

function WorkerDashboard() {
  const { userId } = useAuth()
  const navigate = useNavigate()

  const metricsQuery = useQuery({
    queryKey: ["metrics", "worker", userId],
    queryFn: () => DashboardMetricsAPI.getWorkerMetrics(userId!),
    enabled: !!userId,
  })

  // Filter leads assigned to this worker
  const workerLeads = mockLeads.filter((lead) => lead.assignedTo === userId)
  const metrics = metricsQuery.data ?? mockWorkerMetrics

  const contactedThisWeek = workerLeads.filter((lead) => {
    const lastChange = lead.stageHistory[lead.stageHistory.length - 1]
    if (!lastChange) return false
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(lastChange.changedAt) > weekAgo
  }).length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">My Leads Dashboard</h2>

      {/* Worker KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricsCard
          title="Assigned Leads"
          value={workerLeads.length}
          subtitle="Active leads"
          icon="📋"
        />
        <MetricsCard
          title="Contacted This Week"
          value={contactedThisWeek}
          subtitle={`${((contactedThisWeek / workerLeads.length) * 100).toFixed(0)}% of assigned`}
          icon="📱"
        />
        <MetricsCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle="Overall performance"
          icon="✅"
        />
      </div>

      {/* Assigned Leads Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">My Assigned Leads</h3>
        <LeadTable
          leads={workerLeads}
          onRowClick={(lead) => {
            // Navigate to lead detail when available
            console.log("View lead:", lead.id)
          }}
          showFilters={true}
        />
      </div>
    </div>
  )
}

function DealerDashboard() {
  const { selectedChannelId } = useAuth()

  const metricsQuery = useQuery({
    queryKey: ["metrics", "admin", selectedChannelId],
    queryFn: () =>
      DashboardMetricsAPI.getAdminMetrics(selectedChannelId),
    enabled: !!selectedChannelId,
  })

  const funnelsQuery = useQuery({
    queryKey: ["funnels", "summary", selectedChannelId],
    queryFn: () => FunnelAPI.list(selectedChannelId!),
    enabled: !!selectedChannelId,
  })

  const metrics = metricsQuery.data ?? mockDashboardMetrics
  const funnels = funnelsQuery.data ?? []
  const channelLeads = mockLeads.filter((l) => l.channelId === selectedChannelId)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Channel Dashboard</h2>

      {/* Dealer KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricsCard
          title="Total Leads Submitted"
          value={channelLeads.length}
          subtitle="All stages"
          icon="📤"
        />
        <MetricsCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle="Your pipeline"
          icon="📈"
        />
        <MetricsCard
          title="Pipeline Value"
          value={`${(channelLeads.length * 15000).toLocaleString()}`}
          subtitle="Est. potential revenue"
          icon="💰"
        />
      </div>

      {/* Channel Funnels */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Your Funnels</h3>
        {funnels.length === 0 ? (
          <p className="text-[var(--text-muted)]">No funnels in your channel yet</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {funnels.map((funnel) => (
              <div
                key={funnel.id}
                className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded p-4 hover:border-emerald-600 transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{funnel.channelName}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Current Stage: {funnel.stage}
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded">
                    {funnel.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lead Distribution */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Your Leads by Stage</h3>
        <LeadTable
          leads={channelLeads}
          showFilters={true}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { actor, isAdmin, globalRole } = useAuth()
  const navigate = useNavigate()

  if (!actor) {
    return <div>Please log in</div>
  }

  // Determine dashboard type based on role
  const isDealerUser = globalRole === "USER" && !isAdmin
  const isAdminUser = isAdmin

  return (
    <div className="space-y-6">
      {isAdminUser ? (
        <AdminDashboard />
      ) : isDealerUser ? (
        <DealerDashboard />
      ) : (
        <WorkerDashboard />
      )}

      {/* Always show permission panel at bottom */}
      <div className="mt-8">
        <PermissionPanel actor={actor} />
      </div>
    </div>
  )
}
