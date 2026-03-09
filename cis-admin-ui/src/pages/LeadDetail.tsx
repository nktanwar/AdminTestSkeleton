import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import {
  FunnelAPI,
  LeadAPI,
  type Lead,
  type LeadEvent,
  type LeadStageHistoryItem,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { canViewFunnels } from "../lib/access"

interface FlattenedDetail {
  path: string
  value: string
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  return new Date(timestamp).toLocaleString()
}

function getFromRecord(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function resolveStageHistoryText(
  item: LeadStageHistoryItem,
  index: number
): string {
  const record = item as Record<string, unknown>
  const fromStage = getFromRecord(record, [
    "fromStage",
    "from",
    "previousStage",
    "oldStage",
  ])
  const toStage = getFromRecord(record, [
    "toStage",
    "to",
    "newStage",
    "stage",
    "currentStage",
  ])

  if (fromStage && toStage) {
    return `${fromStage} -> ${toStage}`
  }

  return toStage ?? fromStage ?? `Stage update ${index + 1}`
}

function resolveStageHistoryMeta(item: LeadStageHistoryItem): {
  when: string | null
  who: string | null
} {
  const record = item as Record<string, unknown>

  return {
    when: getFromRecord(record, [
      "changedAt",
      "createdAt",
      "eventAt",
      "at",
      "timestamp",
    ]),
    who: getFromRecord(record, [
      "changedBy",
      "actorName",
      "updatedBy",
      "createdBy",
    ]),
  }
}

function resolveEventText(
  event: LeadEvent,
  index: number
): string {
  const record = event as Record<string, unknown>
  const directMessage = getFromRecord(record, [
    "message",
    "description",
    "text",
  ])
  if (directMessage) {
    return directMessage
  }

  const actor =
    getFromRecord(record, [
      "actorName",
      "createdBy",
      "initiatedBy",
    ]) ?? "System"

  const fromOwner = getFromRecord(record, [
    "fromOwnerMemberName",
    "fromOwner",
    "oldOwnerName",
  ])
  const toOwner = getFromRecord(record, [
    "toOwnerMemberName",
    "toOwner",
    "newOwnerName",
  ])

  if (fromOwner || toOwner) {
    return `${actor} transferred lead from ${
      fromOwner ?? "Unknown"
    } -> ${toOwner ?? "Unknown"}`
  }

  const eventType = getFromRecord(record, [
    "type",
    "eventType",
    "name",
  ])
  if (eventType) {
    return eventType
  }

  return `Event ${index + 1}`
}

function resolveEventTime(event: LeadEvent): string | null {
  const record = event as Record<string, unknown>
  return getFromRecord(record, [
    "createdAt",
    "eventAt",
    "at",
    "timestamp",
  ])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function toLabel(key: string): string {
  const withSpaces = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()

  if (!withSpaces) {
    return "Field"
  }

  return withSpaces
    .split(" ")
    .map((segment) =>
      segment.charAt(0).toUpperCase() +
      segment.slice(1).toLowerCase()
    )
    .join(" ")
}

function looksLikeDateField(path: string): boolean {
  const lastSegment = path
    .replace(/\[\d+\]/g, "")
    .split(".")
    .pop()
    ?.toLowerCase()

  if (!lastSegment) {
    return false
  }

  return (
    lastSegment.endsWith("at") ||
    lastSegment.includes("date") ||
    lastSegment.includes("time") ||
    lastSegment.includes("timestamp")
  )
}

function formatScalar(
  path: string,
  value: string | number | boolean | bigint
): string {
  const raw = typeof value === "string" ? value.trim() : String(value)

  if (!raw) {
    return "-"
  }

  if (typeof value === "string" && looksLikeDateField(path)) {
    const timestamp = Date.parse(raw)
    if (!Number.isNaN(timestamp)) {
      return `${new Date(timestamp).toLocaleString()} (${raw})`
    }
  }

  return raw
}

function flattenDetails(
  value: unknown,
  path = "value",
  depth = 0
): FlattenedDetail[] {
  if (depth > 6) {
    return [{ path, value: "[Max depth reached]" }]
  }

  if (value === null || value === undefined) {
    return [{ path, value: "-" }]
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return [{ path, value: formatScalar(path, value) }]
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ path, value: "-" }]
    }

    return value.flatMap((item, index) =>
      flattenDetails(item, `${path}[${index}]`, depth + 1)
    )
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      return [{ path, value: "-" }]
    }

    return entries.flatMap(([key, itemValue]) =>
      flattenDetails(itemValue, `${path}.${key}`, depth + 1)
    )
  }

  return [{ path, value: String(value) }]
}

export default function LeadDetail() {
  const { channelId, id, leadId } = useParams<{
    channelId: string
    id: string
    leadId: string
  }>()
  const navigate = useNavigate()
  const { isAdmin, permissions } = useAuth()
  const canViewFunnelMeta = canViewFunnels(
    isAdmin,
    permissions
  )
  const backToPath = canViewFunnelMeta
    ? `/channels/${channelId}/funnels/${id}`
    : `/channels/${channelId}`

  const funnelQuery = useQuery({
    queryKey: ["funnel", channelId, id],
    queryFn: () => FunnelAPI.get(channelId!, id!),
    enabled: !!channelId && !!id && canViewFunnelMeta,
  })

  const leadsQuery = useQuery({
    queryKey: ["leads", channelId, id],
    queryFn: () => LeadAPI.list(channelId!, id!),
    enabled: !!channelId && !!id,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  })

  const lead: Lead | null = useMemo(() => {
    if (!leadId) return null
    return (
      (leadsQuery.data ?? []).find(
        (currentLead) => currentLead.id === leadId
      ) ?? null
    )
  }, [leadId, leadsQuery.data])

  const allDetailSections = useMemo(() => {
    if (!lead) {
      return []
    }

    return Object.entries(lead.raw ?? {}).map(
      ([key, value]) => ({
        key,
        title: toLabel(key),
        rows: flattenDetails(value, key),
      })
    )
  }, [lead])

  if (!channelId || !id || !leadId) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">Invalid lead route.</div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          Back
        </button>
      </div>
    )
  }

  if (leadsQuery.isLoading) {
    return (
      <div className="text-[var(--text-muted)]">Loading lead...</div>
    )
  }

  if (leadsQuery.error) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">
          {leadsQuery.error instanceof Error
            ? leadsQuery.error.message
            : "Failed to load lead"}
        </div>
        <button
          onClick={() =>
            navigate(backToPath)
          }
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          {canViewFunnelMeta ? "Back to Lead List" : "Back to Channel"}
        </button>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <div className="text-[var(--text-muted)]">
          Lead not found in this funnel.
        </div>
        <button
          onClick={() =>
            navigate(backToPath)
          }
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          {canViewFunnelMeta ? "Back to Lead List" : "Back to Channel"}
        </button>
      </div>
    )
  }

  const stageHistory = lead.stageHistory ?? []
  const events = lead.events ?? []
  const customerName = lead.customerSnapshot.name || "Unknown Lead"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Lead Detail: {customerName}
          </h2>
          <p className="text-base text-[var(--text-muted)]">
            Funnel: {canViewFunnelMeta ? funnelQuery.data?.name ?? id : id}
          </p>
        </div>
        <button
          onClick={() =>
            navigate(backToPath)
          }
          className="px-3 py-1.5 rounded border border-[var(--border)] text-sm font-medium hover:bg-[var(--accent-soft)]"
        >
          {canViewFunnelMeta ? "Back to Lead List" : "Back to Channel"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-2">
          <h3 className="text-base font-semibold">Customer Information</h3>
          <Field
            label="Name"
            value={lead.customerSnapshot.name}
            emphasize
          />
          <Field
            label="Phone"
            value={lead.customerSnapshot.phone}
            emphasize
          />
          <Field label="Email" value={lead.customerSnapshot.email} />
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-2">
          <h3 className="text-base font-semibold">Lead Information</h3>
          <Field label="Owner" value={lead.ownerMemberName} emphasize />
          <Field label="Stage" value={lead.stage} emphasize />
          <Field label="Status" value={lead.status} emphasize />
          <Field label="Source" value={lead.source} />
          <Field label="Created By" value={lead.creatorName} emphasize />
          <Field label="Created At" value={formatDate(lead.createdAt)} />
          <Field label="Closed At" value={formatDate(lead.closedAt)} />
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold">Stage History</h3>

        {stageHistory.length === 0 && (
          <p className="text-base text-[var(--text-muted)]">
            No stage history available.
          </p>
        )}

        {stageHistory.length > 0 && (
          <ol className="space-y-3">
            {stageHistory.map((item, index) => {
              const meta = resolveStageHistoryMeta(item)
              return (
                <li
                  key={`${index}-${resolveStageHistoryText(item, index)}`}
                  className="border border-[var(--border)] rounded p-3"
                >
                  <div className="text-base font-semibold">
                    {resolveStageHistoryText(item, index)}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {meta.when ? formatDate(meta.when) : "Time unavailable"}
                    {meta.who ? ` | ${meta.who}` : ""}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold">Events</h3>

        {events.length === 0 && (
          <p className="text-base text-[var(--text-muted)]">
            No events available.
          </p>
        )}

        {events.length > 0 && (
          <ol className="space-y-3">
            {events.map((event, index) => (
              <li
                key={`${index}-${resolveEventText(event, index)}`}
                className="border border-[var(--border)] rounded p-3"
              >
                <div className="text-base font-semibold">
                  {resolveEventText(event, index)}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  {formatDate(resolveEventTime(event))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold">All Backend Details</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Full payload grouped by backend field, with safe handling for null or empty values.
          </p>
        </div>

        {allDetailSections.length === 0 && (
          <p className="text-base text-[var(--text-muted)]">
            No additional backend fields available.
          </p>
        )}

        {allDetailSections.length > 0 && (
          <div className="space-y-4">
            {allDetailSections.map((section) => (
              <div
                key={section.key}
                className="border border-[var(--border)] rounded-lg overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--accent-soft)] text-sm font-semibold tracking-wide uppercase">
                  {section.title}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-[var(--text-muted)] text-sm border-b border-[var(--border)]">
                        <th className="text-left px-4 py-2 font-medium">Field</th>
                        <th className="text-left px-4 py-2 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr
                          key={`${section.key}-${row.path}-${index}`}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="px-4 py-2 text-sm font-mono align-top text-[var(--text-muted)]">
                            {row.path}
                          </td>
                          <td className="px-4 py-2 align-top break-words font-medium">
                            {row.value || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string | null | undefined
  emphasize?: boolean
}) {
  return (
    <div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      <div className={emphasize ? "text-base font-semibold" : "text-base font-medium"}>
        {value && value.trim() ? value : "-"}
      </div>
    </div>
  )
}
