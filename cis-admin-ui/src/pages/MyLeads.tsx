import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import {
  ChannelAPI,
  LeadAPI,
  type Lead,
} from "../lib/api"

const STAGE_OPTIONS = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "ORDER_PLACED",
  "ORDER_COMPLETED",
  "DROPPED",
  "CLOSED",
]

const STATUS_OPTIONS = ["ACTIVE", "FROZEN", "CLOSED"]

function formatDate(value: string | null): string {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  return new Date(timestamp).toLocaleString()
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
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

export default function MyLeads() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()

  const [stageFilter, setStageFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [nameSearch, setNameSearch] = useState("")
  const [phoneSearch, setPhoneSearch] = useState("")

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

  const myLeadsQuery = useQuery({
    queryKey: ["leads", "my", resolvedChannelId],
    queryFn: () => LeadAPI.myLeads(resolvedChannelId!),
    enabled: !!resolvedChannelId,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  })

  const leads = myLeadsQuery.data ?? []

  const filteredLeads = useMemo(() => {
    const normalizedName = normalizeText(nameSearch)
    const normalizedPhone = normalizeText(phoneSearch)

    return leads.filter((lead) => {
      if (stageFilter !== "ALL" && lead.stage !== stageFilter) {
        return false
      }

      if (statusFilter !== "ALL" && lead.status !== statusFilter) {
        return false
      }

      if (
        normalizedName &&
        !normalizeText(lead.customerSnapshot.name ?? "").includes(
          normalizedName
        )
      ) {
        return false
      }

      if (
        normalizedPhone &&
        !normalizeText(lead.customerSnapshot.phone ?? "").includes(
          normalizedPhone
        )
      ) {
        return false
      }

      return true
    })
  }, [leads, stageFilter, statusFilter, nameSearch, phoneSearch])

  if (!channelId) {
    return <div className="text-red-500">Invalid channel id.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            My Leads
          </h2>
          <p className="text-base text-[var(--text-muted)]">
            {channelQuery.data?.name
              ? `${channelQuery.data.name} - leads assigned to you`
              : "Leads assigned to you"}
          </p>
          {channelId && !resolvedChannelId && (
            <p className="text-sm text-amber-400 mt-1">
              Invalid channel id format for lead endpoints.
            </p>
          )}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          >
            <option value="ALL">All stages</option>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder="Search by customer name"
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          />

          <input
            value={phoneSearch}
            onChange={(event) => setPhoneSearch(event.target.value)}
            placeholder="Search by phone"
            className="px-3 py-2 rounded bg-zinc-800 text-base"
          />
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] text-base font-medium text-[var(--text-muted)]">
          {myLeadsQuery.isLoading
            ? "Loading leads..."
            : `${filteredLeads.length} lead(s) shown`}
        </div>

        {myLeadsQuery.error && (
          <div className="p-4 text-red-500 text-base font-medium">
            {myLeadsQuery.error instanceof Error
              ? myLeadsQuery.error.message
              : "Failed to load assigned leads."}
          </div>
        )}

        {!myLeadsQuery.isLoading &&
          !myLeadsQuery.error &&
          leads.length === 0 && (
          <div className="p-6 text-[var(--text-muted)] text-base">
            No leads assigned to you in this channel.
          </div>
        )}

        {!myLeadsQuery.isLoading &&
          !myLeadsQuery.error &&
          leads.length > 0 &&
          filteredLeads.length === 0 && (
          <div className="p-6 text-[var(--text-muted)] text-base">
            No leads match the current filters.
          </div>
        )}

        {!myLeadsQuery.isLoading &&
          !myLeadsQuery.error &&
          filteredLeads.length > 0 && (
          <table className="w-full text-base">
            <thead className="text-[var(--text-muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Owner</th>
                <th className="text-left px-4 py-3 font-semibold">Stage</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
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
                      <div className="font-semibold">
                        {lead.customerSnapshot.name}
                      </div>
                      <div className="font-mono text-sm text-[var(--text-muted)]">
                        {lead.customerSnapshot.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {lead.ownerMemberName}
                    </td>
                    <td className="px-4 py-3 font-semibold">{lead.stage}</td>
                    <td className="px-4 py-3 font-semibold">{lead.status}</td>
                    <td className="px-4 py-3 font-medium">
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
    </div>
  )
}
