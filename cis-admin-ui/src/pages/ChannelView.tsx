import { type ReactNode, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ApiError,
  ChannelAPI,
  DashboardAPI,
  LeadAPI,
  type DashboardResponse,
  type Lead,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { canViewFunnels } from "../lib/access"
import type { Channel } from "../types/channel"

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

interface QuickAction {
  title: string
  description: string
  actionLabel: string
  onClick: () => void
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }
  return new Date(timestamp).toLocaleString()
}

function formatRate(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-"
  }

  return value.toFixed(1) + "%"
}

function isObjectIdHex(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value)
}

function getLeadFunnelId(lead: Lead): string | null {
  if (lead.funnelId && isObjectIdHex(lead.funnelId)) {
    return lead.funnelId
  }

  return null
}

function getLeadDetailPath(
  channelId: string,
  lead: Lead
): string {
  const leadFunnelId = getLeadFunnelId(lead)
  if (leadFunnelId) {
    return "/channels/" + channelId + "/funnels/" + leadFunnelId + "/leads/" + lead.id
  }

  return "/channels/" + channelId + "/leads/" + lead.id
}

function toApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) {
    return "You do not have access to this channel resource."
  }

  if (error instanceof Error) return error.message
  return fallback
}

function statusTone(status: Channel["status"]): string {
  if (status === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-300"
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <h3 className="text-xl font-semibold">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyPanel({
  message,
  tone = "default",
}: {
  message: string
  tone?: "default" | "warning"
}) {
  const toneClassName =
    tone === "warning"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : "border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)]"

  return (
    <div
      className={[
        "rounded-xl border px-4 py-5 text-sm",
        toneClassName,
      ].join(" ")}
    >
      {message}
    </div>
  )
}

function OverviewStatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {helper}
      </p>
    </div>
  )
}

function InfoField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  )
}

function CapabilityRow({
  label,
  description,
  enabled,
}: {
  label: string
  description: string
  enabled: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      <span
        className={[
          "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
          enabled
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]",
        ].join(" ")}
      >
        {enabled ? "Enabled" : "Restricted"}
      </span>
    </div>
  )
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
    >
      <p className="text-lg font-semibold">{action.title}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {action.description}
      </p>
      <p className="mt-5 text-sm font-semibold text-[var(--accent)]">
        {action.actionLabel}
      </p>
    </button>
  )
}

export default function ChannelView() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const {
    isAdmin,
    channelMe,
    capabilities,
    permissions,
  } = useAuth()
  const isChannelAdmin =
    isAdmin || channelMe?.isAdmin === true
  const showFunnels = canViewFunnels(
    isChannelAdmin,
    permissions
  )
  const canCreateFunnel =
    isChannelAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    permissions.includes("CREATE_FUNNEL")

  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId,
  })

  const resolvedChannelId = useMemo(() => {
    if (channelId && isObjectIdHex(channelId)) {
      return channelId
    }

    const fallbackId = channelQuery.data?.id
    if (fallbackId && isObjectIdHex(fallbackId)) {
      return fallbackId
    }

    return null
  }, [channelId, channelQuery.data?.id])

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", resolvedChannelId],
    queryFn: () => DashboardAPI.get(resolvedChannelId!),
    enabled: !!resolvedChannelId,
  })

  const assignedLeadsQuery = useQuery({
    queryKey: ["leads", "my", resolvedChannelId],
    queryFn: () => LeadAPI.myLeads(resolvedChannelId!),
    enabled:
      !!resolvedChannelId &&
      !showFunnels &&
      !isChannelAdmin,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  })

  const assignedLeads = useMemo(
    () => assignedLeadsQuery.data ?? [],
    [assignedLeadsQuery.data]
  )

  if (!channelId) {
    return (
      <SectionCard title="Channel Error">
        <EmptyPanel message="Invalid channel id." tone="warning" />
      </SectionCard>
    )
  }

  if (channelQuery.error) {
    return (
      <SectionCard title="Channel Error">
        <EmptyPanel
          message={toApiErrorMessage(
            channelQuery.error,
            "Failed to load channel"
          )}
          tone="warning"
        />
      </SectionCard>
    )
  }

  if (channelQuery.isLoading || !channelQuery.data) {
    return (
      <SectionCard
        title="Loading Channel"
        subtitle="Preparing the latest channel overview."
      >
        <EmptyPanel message="Loading channel details..." />
      </SectionCard>
    )
  }

  const channel: Channel = channelQuery.data
  const dashboard = dashboardQuery.data ?? EMPTY_DASHBOARD
  const overviewStats = [
    {
      label: "Status",
      value: channel.status,
      helper: "Operational state of this channel.",
    },
    {
      label: isChannelAdmin ? "Visible Leads" : "My Visible Leads",
      value: dashboardQuery.data
        ? String(dashboard.summary.totalLeads)
        : dashboardQuery.isLoading
          ? "..."
          : "-",
      helper: isChannelAdmin
        ? "Lead count available from the dashboard service."
        : "Lead count scoped to your current membership.",
    },
    {
      label: "Conversion Rate",
      value: dashboardQuery.data
        ? formatRate(dashboard.summary.conversionRate)
        : dashboardQuery.isLoading
          ? "..."
          : "-",
      helper: "Closed leads divided by total visible leads.",
    },
    {
      label: isChannelAdmin ? "Active Dealers" : "Recent Funnels",
      value: dashboardQuery.data
        ? String(
            isChannelAdmin
              ? dashboard.dealerCount
              : dashboard.recentFunnels.length
          )
        : dashboardQuery.isLoading
          ? "..."
          : "-",
      helper: isChannelAdmin
        ? "External active members currently counted for this channel."
        : "Latest funnels returned in your scoped dashboard response.",
    },
    {
      label: "Wallet",
      value: channel.walletEnabled ? "Enabled" : "Disabled",
      helper: "Whether wallet features are enabled for this channel.",
    },
    {
      label: "Knowledge Center",
      value: channel.knowledgeCenterAccess ? "Enabled" : "Disabled",
      helper: "Whether knowledge center access is available here.",
    },
  ]

  const quickActions: QuickAction[] = [
    ...(showFunnels
      ? [
          {
            title: "Funnels",
            description:
              "Browse existing funnels and move into funnel-specific lead workflows.",
            actionLabel: "Open funnels",
            onClick: () => navigate("/channels/" + channelId + "/funnels"),
          },
        ]
      : []),
    ...(canCreateFunnel
      ? [
          {
            title: "Create Funnel",
            description:
              "Launch a new funnel directly from this channel workspace.",
            actionLabel: "Create new funnel",
            onClick: () => navigate("/channels/" + channelId + "/funnels/new"),
          },
        ]
      : []),
    ...(!isChannelAdmin
      ? [
          {
            title: "My Leads",
            description:
              "Open the filtered view of leads assigned to your membership.",
            actionLabel: "Review assigned leads",
            onClick: () => navigate("/channels/" + channelId + "/my-leads"),
          },
        ]
      : []),
    ...(capabilities.canViewMembers
      ? [
          {
            title: "Members",
            description:
              "Review the team and external members attached to this channel.",
            actionLabel: "Open members",
            onClick: () => navigate("/channels/" + channelId + "/members"),
          },
        ]
      : []),
    ...(capabilities.canUpdateChannel
      ? [
          {
            title: "Settings",
            description:
              "Manage channel settings and permission set assignments with real controls only.",
            actionLabel: "Open settings",
            onClick: () => navigate("/channels/" + channelId + "/settings"),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.15),rgba(15,20,27,0.95))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.18em]">
              <span className={[
                "rounded-full border px-3 py-1 uppercase",
                statusTone(channel.status),
              ].join(" ")}>
                {channel.status}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[var(--text-soft)]">
                {channel.code}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[var(--text-soft)]">
                {isChannelAdmin ? "Admin Access" : "Scoped Access"}
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Channel Overview
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--text-soft)]">
                {isChannelAdmin
                  ? "High-level operational context for this channel, including configuration, access, and recent activity signals."
                  : "A refined workspace for your current channel membership with only the data and actions you are allowed to use."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/channels")}
            className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
          >
            Back to Channels
          </button>
        </div>
      </section>

      {!resolvedChannelId && (
        <EmptyPanel
          message="This channel loaded, but its id cannot be used for scoped dashboard or lead endpoints. Some overview sections may stay unavailable until the route uses a valid channel ObjectId."
          tone="warning"
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewStats.map((stat) => (
          <OverviewStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            helper={stat.helper}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Channel Details"
          subtitle="Core metadata and platform feature switches for this channel."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoField label="Channel Name" value={channel.name} />
            <InfoField label="Channel Code" value={channel.code} />
            <InfoField label="Created At" value={formatDate(channel.createdAt ?? null)} />
            <InfoField label="Updated At" value={formatDate(channel.updatedAt ?? null)} />
            <InfoField
              label="Wallet Access"
              value={channel.walletEnabled ? "Enabled" : "Disabled"}
            />
            <InfoField
              label="Knowledge Center"
              value={channel.knowledgeCenterAccess ? "Enabled" : "Disabled"}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Workspace Access"
          subtitle="Visibility and navigation currently available in this channel context."
        >
          <div className="space-y-3">
            <CapabilityRow
              label="Funnels"
              description="Access funnel pages and funnel-linked lead navigation."
              enabled={showFunnels}
            />
            <CapabilityRow
              label="Members"
              description="Open the members area for this channel."
              enabled={capabilities.canViewMembers}
            />
            <CapabilityRow
              label="Settings"
              description="Manage settings and permission assignments."
              enabled={capabilities.canUpdateChannel}
            />
            <CapabilityRow
              label="Admin Scope"
              description="Full channel visibility instead of membership-scoped access."
              enabled={isChannelAdmin}
            />
          </div>
        </SectionCard>
      </div>

      {quickActions.length > 0 && (
        <SectionCard
          title="Quick Actions"
          subtitle="Direct links to real destinations inside this channel."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.title}
                action={action}
              />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Recent Funnels"
        subtitle={
          showFunnels
            ? "Recent funnels returned by the channel dashboard API."
            : "Recent funnels from the dashboard response. Navigation stays disabled when funnel access is restricted."
        }
      >
        {!resolvedChannelId ? (
          <EmptyPanel message="Recent funnel data is unavailable without a valid scoped channel id." tone="warning" />
        ) : dashboardQuery.isLoading ? (
          <EmptyPanel message="Loading recent funnel activity..." />
        ) : dashboardQuery.error ? (
          <EmptyPanel
            message={toApiErrorMessage(
              dashboardQuery.error,
              "Failed to load dashboard details."
            )}
            tone="warning"
          />
        ) : dashboard.recentFunnels.length === 0 ? (
          <EmptyPanel message="No recent funnels were returned for this channel." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.recentFunnels.map((funnel) => (
              <button
                key={funnel.id}
                type="button"
                onClick={() =>
                  navigate(
                    "/channels/" + channelId + "/funnels/" + funnel.id
                  )
                }
                disabled={!showFunnels}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:cursor-default disabled:hover:border-[var(--border)] disabled:hover:bg-[var(--bg-panel)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{funnel.name}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                      {funnel.id}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDate(funnel.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {!showFunnels && !isChannelAdmin && (
        <SectionCard
          title="Assigned Leads"
          subtitle="Your lead workspace remains available even when funnel navigation is restricted."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              Leads shown here are scoped to your membership in this channel.
            </p>
            <button
              type="button"
              onClick={() =>
                navigate("/channels/" + channelId + "/my-leads")
              }
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)]"
            >
              Open My Leads
            </button>
          </div>

          {!resolvedChannelId ? (
            <EmptyPanel message="Assigned leads are unavailable without a valid scoped channel id." tone="warning" />
          ) : assignedLeadsQuery.isLoading ? (
            <EmptyPanel message="Loading assigned leads..." />
          ) : assignedLeadsQuery.error ? (
            <EmptyPanel
              message={toApiErrorMessage(
                assignedLeadsQuery.error,
                "Failed to load assigned leads."
              )}
              tone="warning"
            />
          ) : assignedLeads.length === 0 ? (
            <EmptyPanel message="No assigned leads found in this channel." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--bg-panel)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Owner</th>
                    <th className="px-4 py-3 text-left font-medium">Created At</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedLeads.map((lead) => {
                    const detailPath = getLeadDetailPath(
                      channelId,
                      lead
                    )

                    return (
                      <tr
                        key={lead.id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {lead.customerSnapshot.name}
                          </div>
                          <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                            {lead.customerSnapshot.phone}
                          </div>
                        </td>
                        <td className="px-4 py-4">{lead.stage}</td>
                        <td className="px-4 py-4">{lead.status}</td>
                        <td className="px-4 py-4">{lead.ownerMemberName}</td>
                        <td className="px-4 py-4">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(detailPath)}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--accent-soft)]"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
