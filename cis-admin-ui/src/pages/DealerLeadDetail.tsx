import { useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import {
  DealerAPI,
  type UpdateDealerLeadStagePayload,
} from "../lib/api"

const STAGE_OPTIONS = [
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "ORDER_PLACED",
  "CLOSED",
  "DROPPED",
] as const

type DealerStageOption = (typeof STAGE_OPTIONS)[number]

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

export default function DealerLeadDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [nextStage, setNextStage] =
    useState<DealerStageOption>(STAGE_OPTIONS[0])
  const [comment, setComment] = useState("")

  const leadQuery = useQuery({
    queryKey: ["dealer-lead", id],
    queryFn: () => DealerAPI.getLead(id!),
    enabled: !!id,
  })

  const updateStageMutation = useMutation({
    mutationFn: (payload: UpdateDealerLeadStagePayload) =>
      DealerAPI.updateLeadStage(id!, payload),
    onSuccess: async (updatedLead) => {
      queryClient.setQueryData(["dealer-lead", id], updatedLead)
      queryClient.setQueryData(
        ["dealer-leads"],
        (current: unknown) => {
          if (!Array.isArray(current)) return current
          return current.map((lead) =>
            lead &&
            typeof lead === "object" &&
            "id" in lead &&
            lead.id === updatedLead.id
              ? updatedLead
              : lead
          )
        }
      )
      setComment("")
      setNextStage(STAGE_OPTIONS[0])
    },
  })

  if (!id) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        Missing lead id.
      </div>
    )
  }

  if (leadQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Loading lead details...
      </div>
    )
  }

  if (leadQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {leadQuery.error instanceof Error
          ? leadQuery.error.message
          : "Failed to load lead details."}
      </div>
    )
  }

  const lead = leadQuery.data
  if (!lead) return null

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {lead.customerSnapshot.name}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Assigned dealer: {lead.ownerName}
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 font-semibold text-[var(--accent)]">
              {lead.stage}
            </span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              {lead.status}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Phone" value={lead.customerSnapshot.phone} />
          <InfoCard
            label="Email"
            value={lead.customerSnapshot.email || "—"}
          />
          <InfoCard label="Source" value={lead.source} />
          <InfoCard label="Created By" value={lead.creatorName} />
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-xl font-semibold">Update Stage</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          This uses the dealer PATCH endpoint. Backend transition rules still
          decide what is valid.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
          <select
            value={nextStage}
            onChange={(event) =>
              setNextStage(event.target.value as DealerStageOption)
            }
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
          >
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>

          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional comment"
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none focus:border-[var(--accent)]"
          />

          <button
            type="button"
            onClick={() =>
              updateStageMutation.mutate({
                stage: nextStage,
                comment: comment.trim() || undefined,
              })
            }
            disabled={updateStageMutation.isPending}
            className="rounded-2xl bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {updateStageMutation.isPending
              ? "Updating..."
              : "Update Stage"}
          </button>
        </div>

        {updateStageMutation.error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {updateStageMutation.error instanceof Error
              ? updateStageMutation.error.message
              : "Failed to update stage."}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold">Stage History</h2>
          <div className="mt-5 space-y-4">
            {lead.stageHistory.length === 0 && (
              <EmptyTimeline message="No stage history available yet." />
            )}
            {lead.stageHistory.map((item, index) => (
              <div
                key={`${item.changedAt ?? "stage"}-${index}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4"
              >
                <div className="text-sm font-medium">
                  {(item.from ?? "NEW")} to {item.to ?? "—"}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  {formatDate(item.changedAt)} by {item.changedByName ?? "—"}
                </div>
                {item.comment && (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {item.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold">Events Timeline</h2>
          <div className="mt-5 space-y-4">
            {lead.events.length === 0 && (
              <EmptyTimeline message="No lead events available yet." />
            )}
            {lead.events.map((event, index) => (
              <div
                key={`${event.createdAt ?? "event"}-${index}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4"
              >
                <div className="text-sm font-medium">
                  {event.type ?? event.message ?? "Event"}
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  {formatDate(event.createdAt)}
                </div>
                {(event.note ?? event.message) && (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {event.note ?? event.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  )
}

function EmptyTimeline({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-4 py-6 text-sm text-[var(--text-muted)]">
      {message}
    </div>
  )
}
