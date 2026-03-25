import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import {
  ApiError,
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

const NEXT_STAGE_MAP: Record<string, string[]> = {
  NEW: ["CONTACTED", "DROPPED"],
  CONTACTED: ["QUALIFIED", "DROPPED"],
  QUALIFIED: ["QUOTED", "DROPPED"],
  QUOTED: ["ORDER_PLACED", "DROPPED"],
  ORDER_PLACED: ["CLOSED", "DROPPED"],
}

const STAGE_GUIDANCE: Record<
  string,
  { title: string; note: string }
> = {
  CONTACTED: {
    title: "Move to Contacted",
    note: "Use this after the first real outreach or conversation attempt has happened.",
  },
  QUALIFIED: {
    title: "Move to Qualified",
    note: "Use this when the lead has confirmed interest, fit, or buying intent and is worth active follow-up.",
  },
  QUOTED: {
    title: "Move to Quoted",
    note: "Use this once pricing, proposal details, or a formal offer has been shared with the customer.",
  },
  ORDER_PLACED: {
    title: "Move to Order Placed",
    note: "Use this when the customer has committed and the order or booking is effectively confirmed.",
  },
  CLOSED: {
    title: "Move to Closed",
    note: "Use this after the deal is fully completed and no more sales-stage movement is expected.",
  },
  DROPPED: {
    title: "Move to Dropped",
    note: "Use this when the lead is no longer active. Add a short reason so the team understands why it was closed out.",
  },
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  return new Date(timestamp).toLocaleString()
}

function isObjectIdHex(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value)
}

function getMoveStageOptions(lead: Lead): string[] {
  if (lead.status !== "ACTIVE") {
    return []
  }

  return NEXT_STAGE_MAP[lead.stage] ?? []
}

function toMutationErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof ApiError) {
    return error.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function getStageGuidance(stage: string): {
  title: string
  note: string
} {
  return (
    STAGE_GUIDANCE[stage] ?? {
      title: `Move to ${toLabel(stage)}`,
      note: "Use this when the lead has clearly progressed to the next confirmed step in the pipeline.",
    }
  )
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
  comment: string | null
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
      "changedByName",
      "changedBy",
      "actorName",
      "updatedBy",
      "createdBy",
    ]),
    comment: getFromRecord(record, [
      "comment",
      "note",
      "reason",
      "description",
    ]),
  }
}

function resolveEventActor(event: LeadEvent): string {
  const record = event as Record<string, unknown>
  return (
    getFromRecord(record, [
      "actorName",
      "createdBy",
      "initiatedBy",
      "updatedBy",
    ]) ?? "System"
  )
}

function resolveEventType(event: LeadEvent): string {
  const record = event as Record<string, unknown>
  return (
    getFromRecord(record, [
      "type",
      "eventType",
      "name",
      "action",
    ]) ?? "Activity"
  )
}

function resolveEventTime(event: LeadEvent): string | null {
  const record = event as Record<string, unknown>
  return getFromRecord(record, [
    "changedAt",
    "createdAt",
    "eventAt",
    "at",
    "timestamp",
  ])
}

function isObjectIdLike(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim())
}

function sanitizeEventDisplayValue(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed === "-" || isObjectIdLike(trimmed)) {
    return null
  }

  return trimmed
}

function resolveEventFromTo(event: LeadEvent): {
  from: string | null
  to: string | null
} {
  const record = event as Record<string, unknown>

  return {
    from: sanitizeEventDisplayValue(
      getFromRecord(record, [
        "fromUserName",
        "fromOwnerMemberName",
        "fromOwner",
        "oldOwnerName",
        "fromLabel",
      ])
    ),
    to: sanitizeEventDisplayValue(
      getFromRecord(record, [
        "toUserName",
        "toOwnerMemberName",
        "toOwner",
        "newOwnerName",
        "toLabel",
      ])
    ),
  }
}

function formatEventTypeLabel(value: string): string {
  const normalized = value.trim()
  if (!normalized) {
    return "Activity"
  }

  return toLabel(normalized)
}

function resolveEventMetadata(event: LeadEvent): FlattenedDetail[] {
  const record = event as Record<string, unknown>
  const metadata = record.metadata

  if (
    metadata === null ||
    metadata === undefined ||
    metadata === "-"
  ) {
    return []
  }

  const rows = flattenDetails(metadata, "metadata").map((row) => {
    const normalizedPath =
      row.path === "metadata"
        ? "Value"
        : row.path.replace(/^metadata\./, "")

    return {
      path: normalizedPath,
      value: row.value,
    }
  })

  return rows.filter((row) => {
    const path = row.path.toLowerCase()
    const value = row.value.trim()

    if (!value || value === "-") {
      return false
    }

    if (
      path === "id" ||
      path.endsWith(".id") ||
      path.endsWith("id")
    ) {
      return false
    }

    if (isObjectIdLike(value)) {
      return false
    }

    return true
  })
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

function getStatusTone(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-[var(--text-primary)]"
    case "FROZEN":
      return "border-amber-500/30 bg-amber-500/10 text-[var(--text-primary)]"
    case "CLOSED":
      return "border-slate-500/30 bg-slate-500/10 text-[var(--text-primary)]"
    default:
      return "border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)]"
  }
}

function getStageTone(stage: string): string {
  switch (stage.toUpperCase()) {
    case "NEW":
      return "border-sky-500/30 bg-sky-500/10 text-[var(--text-primary)]"
    case "CONTACTED":
      return "border-cyan-500/30 bg-cyan-500/10 text-[var(--text-primary)]"
    case "QUALIFIED":
      return "border-indigo-500/30 bg-indigo-500/10 text-[var(--text-primary)]"
    case "QUOTED":
      return "border-violet-500/30 bg-violet-500/10 text-[var(--text-primary)]"
    case "ORDER_PLACED":
      return "border-fuchsia-500/30 bg-fuchsia-500/10 text-[var(--text-primary)]"
    case "ORDER_COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-[var(--text-primary)]"
    case "DROPPED":
      return "border-rose-500/30 bg-rose-500/10 text-[var(--text-primary)]"
    case "CLOSED":
      return "border-slate-500/30 bg-slate-500/10 text-[var(--text-primary)]"
    default:
      return "border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)]"
  }
}

function getEventTone(type: string): string {
  const normalized = type.toUpperCase()
  if (normalized.includes("TRANSFER")) {
    return "border-amber-500/30 bg-amber-500/10 text-[var(--text-primary)]"
  }
  if (
    normalized.includes("CREATE") ||
    normalized.includes("ADD")
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-[var(--text-primary)]"
  }
  if (
    normalized.includes("UPDATE") ||
    normalized.includes("EDIT") ||
    normalized.includes("CHANGE")
  ) {
    return "border-sky-500/30 bg-sky-500/10 text-[var(--text-primary)]"
  }
  return "border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)]"
}

function getInitials(value: string): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (words.length === 0) {
    return "?"
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("")
}

export default function LeadDetail() {
  const { channelId, id, leadId } = useParams<{
    channelId: string
    id?: string
    leadId: string
  }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin, permissions } = useAuth()
  const canViewFunnelMeta = canViewFunnels(
    isAdmin,
    permissions
  )
  const isFunnelRoute = !!id
  const backToPath =
    canViewFunnelMeta && isFunnelRoute
      ? `/channels/${channelId}/funnels/${id}`
      : `/channels/${channelId}/my-leads`

  const funnelQuery = useQuery({
    queryKey: ["funnel", channelId, id],
    queryFn: () => FunnelAPI.get(channelId!, id!),
    enabled:
      !!channelId &&
      !!id &&
      canViewFunnelMeta &&
      isFunnelRoute,
  })

  const leadsQuery = useQuery({
    queryKey: isFunnelRoute
      ? ["leads", channelId, id]
      : ["leads", "my", channelId],
    queryFn: () =>
      isFunnelRoute
        ? LeadAPI.list(channelId!, id!)
        : LeadAPI.myLeads(channelId!),
    enabled: !!channelId && (!!id || !isFunnelRoute),
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
  const [nextStage, setNextStage] = useState("")
  const [stageComment, setStageComment] = useState("")
  const [stageMoveNotice, setStageMoveNotice] = useState<string | null>(
    null
  )
  const moveStageOptions = useMemo(
    () => (lead ? getMoveStageOptions(lead) : []),
    [lead]
  )
  const leadBackendId = useMemo(() => {
    if (!lead) {
      return null
    }

    if (lead.backendId && isObjectIdHex(lead.backendId)) {
      return lead.backendId
    }

    if (isObjectIdHex(lead.id)) {
      return lead.id
    }

    return null
  }, [lead])

  useEffect(() => {
    const resetStageForm = window.requestAnimationFrame(() => {
      setNextStage(moveStageOptions[0] ?? "")
      setStageComment("")
      setStageMoveNotice(null)
    })

    return () => {
      window.cancelAnimationFrame(resetStageForm)
    }
  }, [lead?.id, moveStageOptions])

  const moveStageMutation = useMutation({
    mutationFn: (payload: {
      leadId: string
      nextStage: string
      comment?: string
    }) => LeadAPI.moveStage(channelId!, payload),
    onSuccess: async (response) => {
      setStageMoveNotice(
        response.message ||
          "Successfully moved lead to the next stage."
      )
      setStageComment("")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["leads", channelId, id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["leads", "my", channelId],
        }),
      ])
    },
  })

  if (!channelId || !leadId) {
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
          onClick={() => navigate(backToPath)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          {canViewFunnelMeta && isFunnelRoute
            ? "Back to Lead List"
            : "Back to My Leads"}
        </button>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <div className="text-[var(--text-muted)]">
          {isFunnelRoute
            ? "Lead not found in this funnel."
            : "Lead not found in your assigned leads."}
        </div>
        <button
          onClick={() => navigate(backToPath)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          {canViewFunnelMeta && isFunnelRoute
            ? "Back to Lead List"
            : "Back to My Leads"}
        </button>
      </div>
    )
  }

  const stageHistory = lead.stageHistory ?? []
  const events = lead.events ?? []
  const customerName = lead.customerSnapshot.name || "Unknown Lead"
  const moveStageError = moveStageMutation.error
    ? toMutationErrorMessage(
        moveStageMutation.error,
        "Unable to move lead stage."
      )
    : null
  const selectedStageGuidance = nextStage
    ? getStageGuidance(nextStage)
    : null

  function submitMoveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!channelId || !leadBackendId || !nextStage) {
      return
    }

    setStageMoveNotice(null)
    moveStageMutation.mutate({
      leadId: leadBackendId,
      nextStage,
      ...(stageComment.trim()
        ? { comment: stageComment.trim() }
        : {}),
    })
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] md:p-7">
        <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-[var(--accent-soft)] blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Lead Detail
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] text-lg font-bold text-[var(--text-primary)] shadow-[var(--shadow-panel)]">
                {getInitials(customerName)}
              </div>

              <div className="space-y-3">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {customerName}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {canViewFunnelMeta && isFunnelRoute
                      ? `Funnel: ${funnelQuery.data?.name ?? id}`
                      : "Assigned lead detail"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Pill className={getStageTone(lead.stage)}>
                    {lead.stage}
                  </Pill>
                  <Pill className={getStatusTone(lead.status)}>
                    {lead.status}
                  </Pill>
                  <Pill className="border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)]">
                    Owner: {lead.ownerMemberName}
                  </Pill>
                  <Pill className="border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)]">
                    Source: {lead.source}
                  </Pill>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ContactChip
                label="Phone"
                value={lead.customerSnapshot.phone}
              />
              <ContactChip
                label="Email"
                value={lead.customerSnapshot.email}
              />
              <ContactChip
                label="Created By"
                value={lead.creatorName}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[280px] xl:items-end">
            <button
              onClick={() => navigate(backToPath)}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--accent-soft)]"
            >
              {canViewFunnelMeta && isFunnelRoute
                ? "Back to Lead List"
                : "Back to My Leads"}
            </button>

            <div className="grid w-full grid-cols-2 gap-3">
              <MetricCard
                label="Events"
                value={String(events.length)}
              />
              <MetricCard
                label="Stage Updates"
                value={String(stageHistory.length)}
              />
              <MetricCard
                label="Created"
                value={formatDate(lead.createdAt)}
              />
              <MetricCard
                label="Lead ID"
                value={lead.id}
                compact
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Customer Profile"
          subtitle="Primary contact data presented first so this record reads like a real working CRM view."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Full Name"
              value={lead.customerSnapshot.name}
              emphasize
            />
            <Field
              label="Primary Phone"
              value={lead.customerSnapshot.phone}
              emphasize
            />
            <Field
              label="Email Address"
              value={lead.customerSnapshot.email}
            />
            <Field label="Lead Source" value={lead.source} />
          </div>
        </Panel>

        <Panel
          title="Lead Snapshot"
          subtitle="Ownership, current state, and audit basics."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Owner" value={lead.ownerMemberName} emphasize />
            <Field label="Created By" value={lead.creatorName} />
            <Field label="Current Stage" value={lead.stage} emphasize />
            <Field label="Current Status" value={lead.status} emphasize />
            <Field label="Created At" value={formatDate(lead.createdAt)} />
            <Field label="Closed At" value={formatDate(lead.closedAt)} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Move Stage"
        subtitle="Advance the lead using the same forward-only rules enforced by the backend."
      >
        {!leadBackendId && (
          <EmptyState text="This lead does not have a valid backend id, so stage changes are unavailable." />
        )}

        {leadBackendId && moveStageOptions.length === 0 && (
          <EmptyState
            text={
              lead.status === "ACTIVE"
                ? "No forward stage transitions are available from the current stage."
                : `Stage changes are disabled because this lead is ${lead.status.toLowerCase()}.`
            }
          />
        )}

        {leadBackendId && moveStageOptions.length > 0 && (
          <form
            onSubmit={submitMoveStage}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Current Stage"
                value={lead.stage}
                emphasize
              />
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Next Stage
                </div>
                <select
                  value={nextStage}
                  onChange={(event) =>
                    setNextStage(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium"
                >
                  {moveStageOptions.map((option) => (
                    <option key={option} value={option}>
                      {toLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Comment
              </div>
              <textarea
                value={stageComment}
                onChange={(event) =>
                  setStageComment(event.target.value)
                }
                rows={3}
                placeholder="Optional note for this stage move"
                className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium"
              />
            </div>

            {selectedStageGuidance && (
              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3">
                <div className="text-sm font-semibold text-sky-100">
                  {selectedStageGuidance.title}
                </div>
                <div className="mt-1 text-sm leading-6 text-sky-100/85">
                  {selectedStageGuidance.note}
                </div>
              </div>
            )}

            {moveStageError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {moveStageError}
              </div>
            )}

            {stageMoveNotice && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {stageMoveNotice}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={
                  moveStageMutation.isPending || !nextStage
                }
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {moveStageMutation.isPending
                  ? "Moving Stage..."
                  : `Move to ${toLabel(nextStage)}`}
              </button>
              <div className="text-sm text-[var(--text-muted)]">
                Allowed options are derived from the current lead stage and status.
              </div>
            </div>
          </form>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Panel
          title="Stage Journey"
          subtitle="Each pipeline transition is shown as a timeline step."
        >
          {stageHistory.length === 0 && (
            <EmptyState text="No stage history available." />
          )}

          {stageHistory.length > 0 && (
            <ol className="space-y-4">
              {stageHistory.map((item, index) => {
                const meta = resolveStageHistoryMeta(item)
                const stageText = resolveStageHistoryText(item, index)
                const stageParts = stageText
                  .split("->")
                  .map((part) => part.trim())
                  .filter(Boolean)
                const fromStage = stageParts.length > 1 ? stageParts[0] : null
                const toStage =
                  stageParts.length > 1
                    ? stageParts[1]
                    : stageParts[0] ?? stageText

                return (
                  <li
                    key={`${index}-${stageText}`}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {fromStage && (
                            <>
                              <Pill className={getStageTone(fromStage)}>
                                {fromStage}
                              </Pill>
                              <span className="text-sm text-[var(--text-muted)]">
                                to
                              </span>
                            </>
                          )}
                          <Pill className={getStageTone(toStage)}>
                            {toStage}
                          </Pill>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                          <span>
                            {meta.when
                              ? formatDate(meta.when)
                              : "Time unavailable"}
                          </span>
                          <span>{meta.who ?? "Actor unavailable"}</span>
                        </div>
                        {meta.comment && (
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-sm leading-6 text-[var(--text-soft)]">
                            {meta.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>

        <Panel
          title="Activity Feed"
          subtitle="Operational history presented as a readable audit timeline."
        >
          {events.length === 0 && (
            <EmptyState text="No events available." />
          )}

          {events.length > 0 && (
            <ol className="space-y-4">
              {events.map((event, index) => {
                const eventType = resolveEventType(event)
                const actor = resolveEventActor(event)
                const eventTime = resolveEventTime(event)
                const eventTypeLabel = formatEventTypeLabel(
                  eventType
                )
                const transfer = resolveEventFromTo(event)
                const metadata = resolveEventMetadata(event)

                return (
                  <li
                    key={`${index}-${eventType}-${eventTime ?? actor}`}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 shadow-[var(--shadow-panel)]"
                  >
                    <details className="group">
                      <summary className="list-none cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] text-sm font-bold">
                            {getInitials(actor)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-base font-semibold">
                                    {eventTypeLabel}
                                  </div>
                                  <Pill className={getEventTone(eventType)}>
                                    {actor}
                                  </Pill>
                                </div>
                                <div className="mt-2 text-sm text-[var(--text-muted)]">
                                  {transfer.from || transfer.to
                                    ? `${transfer.from ?? "-"} -> ${transfer.to ?? "-"}`
                                    : "Open to view event details"}
                                </div>
                                <div className="mt-1 text-sm text-[var(--text-muted)]">
                                  {eventTime
                                    ? formatDate(eventTime)
                                    : "Time unavailable"}
                                </div>
                              </div>

                              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] transition group-open:bg-[var(--accent-soft)] group-open:text-[var(--text-primary)]">
                                <span className="group-open:hidden">
                                  View Details
                                </span>
                                <span className="hidden group-open:inline">
                                  Hide Details
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </summary>

                      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <EventField
                            label="Event Type"
                            value={eventTypeLabel}
                          />
                          <EventField
                            label="By"
                            value={actor}
                          />
                          <EventField
                            label="From"
                            value={transfer.from ?? "-"}
                          />
                          <EventField
                            label="To"
                            value={transfer.to ?? "-"}
                          />
                          <EventField
                            label="Time"
                            value={
                              eventTime
                                ? formatDate(eventTime)
                                : "Time unavailable"
                            }
                            fullWidth
                          />
                        </div>

                        <div className="mt-4 border-t border-[var(--border)] pt-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            Metadata
                          </div>
                          {metadata.length === 0 ? (
                            <div className="mt-2 text-sm text-[var(--text-muted)]">
                              No metadata
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                              {metadata.map((row) => (
                                <div
                                  key={`${index}-${row.path}`}
                                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2"
                                >
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                    {toLabel(row.path)}
                                  </div>
                                  <div className="mt-1 break-words text-sm font-medium text-[var(--text-soft)]">
                                    {row.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </details>
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>
      </div>

      <details className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-base font-semibold">
              Backend Payload Details
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Raw backend sections stay available, but the screen now prioritizes the human-readable CRM view first.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Expand
          </span>
        </summary>

        <div className="border-t border-[var(--border)] px-5 py-5">
          {allDetailSections.length === 0 && (
            <EmptyState text="No additional backend fields available." />
          )}

          {allDetailSections.length > 0 && (
            <div className="space-y-4">
              {allDetailSections.map((section) => (
                <div
                  key={section.key}
                  className="overflow-hidden rounded-2xl border border-[var(--border)]"
                >
                  <div className="border-b border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold tracking-wide uppercase">
                    {section.title}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-base">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-sm text-[var(--text-muted)]">
                          <th className="px-4 py-2 text-left font-medium">
                            Field
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, index) => (
                          <tr
                            key={`${section.key}-${row.path}-${index}`}
                            className="border-b border-[var(--border)] last:border-b-0"
                          >
                            <td className="px-4 py-2 align-top text-sm font-mono text-[var(--text-muted)]">
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
      </details>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
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
  const displayValue = value && value.trim() ? value : "-"

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={
          emphasize
            ? "mt-2 text-base font-semibold text-[var(--text-primary)]"
            : "mt-2 text-base font-medium text-[var(--text-soft)]"
        }
      >
        {displayValue}
      </div>
    </div>
  )
}

function Pill({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  )
}

function ContactChip({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  const displayValue = value && value.trim() ? value : "-"

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
        {displayValue}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={
          compact
            ? "mt-2 break-all text-sm font-semibold text-[var(--text-primary)]"
            : "mt-2 text-lg font-bold text-[var(--text-primary)]"
        }
      >
        {value}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-muted)]">
      {text}
    </div>
  )
}

function EventField({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div
      className={[
        "rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2",
        fullWidth ? "md:col-span-2" : "",
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--text-soft)] break-words">
        {value}
      </div>
    </div>
  )
}
