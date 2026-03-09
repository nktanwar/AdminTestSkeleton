import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ChannelAPI,
  LeadAPI,
  type Lead,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import {
  canViewFunnels,
} from "../lib/access"
import type { Channel } from "../types/channel"

function formatDate(value: string | null): string {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }
  return new Date(timestamp).toLocaleString()
}

function isObjectIdHex(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value)
}

function getLeadFunnelId(lead: Lead): string | null {
  if (lead.funnelId) {
    return lead.funnelId
  }

  const fromRaw = lead.raw.funnelId ?? lead.raw.funnel_id
  if (typeof fromRaw === "string" && fromRaw.trim()) {
    return fromRaw.trim()
  }

  return null
}

export default function ChannelView() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const { isAdmin, permissions } = useAuth()
  const showFunnels = canViewFunnels(isAdmin, permissions)

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

  const assignedLeadsQuery = useQuery({
    queryKey: ["leads", "my", resolvedChannelId],
    queryFn: () => LeadAPI.myLeads(resolvedChannelId!),
    enabled: !!resolvedChannelId && !showFunnels,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  })

  const assignedLeads = useMemo(
    () => assignedLeadsQuery.data ?? [],
    [assignedLeadsQuery.data]
  )

  if (!channelId) {
    return (
      <div className="text-red-500">Invalid channel id.</div>
    )
  }

  if (channelQuery.error) {
    return (
      <div className="text-red-500">
        {channelQuery.error instanceof Error
          ? channelQuery.error.message
          : "Failed to load channel"}
      </div>
    )
  }

  if (channelQuery.isLoading || !channelQuery.data) {
    return <div className="text-[var(--text-muted)]">Loading…</div>
  }

  const channel: Channel = channelQuery.data

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Channel Overview
        </h2>

        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Status" value={channel.status} />
        <StatCard
          label="Wallet Enabled"
          value={channel.walletEnabled ? "Yes" : "No"}
        />
        <StatCard
          label="Knowledge Center"
          value={
            channel.knowledgeCenterAccess
              ? "Enabled"
              : "Disabled"
          }
        />
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-3">
        <Field
          label="Created At"
          value={channel.createdAt ?? "—"}
        />
        <Field
          label="Updated At"
          value={channel.updatedAt ?? "—"}
        />
      </div>

      {!showFunnels && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold">
              Assigned Leads
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              You can access leads assigned to you even without funnel navigation.
            </p>
            <button
              onClick={() =>
                navigate(`/channels/${channelId}/my-leads`)
              }
              className="mt-3 px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
            >
              Open My Leads
            </button>
          </div>

          {assignedLeadsQuery.isLoading && (
            <div className="p-4 text-sm text-[var(--text-muted)]">
              Loading assigned leads...
            </div>
          )}

          {assignedLeadsQuery.error && (
            <div className="p-4 text-sm text-red-500">
              {assignedLeadsQuery.error instanceof Error
                ? assignedLeadsQuery.error.message
                : "Failed to load assigned leads."}
            </div>
          )}

          {!assignedLeadsQuery.isLoading &&
            !assignedLeadsQuery.error &&
            assignedLeads.length === 0 && (
            <div className="p-4 text-sm text-[var(--text-muted)]">
              No assigned leads found.
            </div>
          )}

          {!assignedLeadsQuery.isLoading &&
            !assignedLeadsQuery.error &&
            assignedLeads.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-[var(--text-muted)]">
                <tr>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Owner</th>
                  <th className="text-left px-4 py-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {assignedLeads.map((lead) => {
                  const leadFunnelId = getLeadFunnelId(lead)
                  const canOpenLead = !!leadFunnelId

                  return (
                    <tr
                      key={lead.id}
                      className={[
                        "border-t border-[var(--border)]",
                        canOpenLead
                          ? "cursor-pointer hover:bg-[var(--accent-soft)]"
                          : "",
                      ].join(" ")}
                      onClick={() => {
                        if (!canOpenLead) return
                        navigate(
                          `/channels/${channelId}/funnels/${leadFunnelId}/leads/${lead.id}`
                        )
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {lead.customerSnapshot.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] font-mono">
                          {lead.customerSnapshot.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">{lead.stage}</td>
                      <td className="px-4 py-3">{lead.status}</td>
                      <td className="px-4 py-3">{lead.ownerMemberName}</td>
                      <td className="px-4 py-3">
                        {formatDate(lead.createdAt)}
                        {!canOpenLead && (
                          <div className="text-xs text-amber-400 mt-1">
                            Funnel id unavailable for open action.
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div>{value}</div>
    </div>
  )
}
