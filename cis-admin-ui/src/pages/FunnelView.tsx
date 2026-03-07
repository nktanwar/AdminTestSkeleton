import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import {
  ApiError,
  ChannelAPI,
  FunnelAPI,
  type FunnelDefinition,
} from "../lib/api"

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Not authorized to view this funnel."
  }

  if (error instanceof Error) return error.message
  return "Failed to load funnel"
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value

  return new Date(timestamp).toLocaleString()
}

export default function FunnelView() {
  const { channelId, id } = useParams<{
    channelId: string
    id: string
  }>()
  const navigate = useNavigate()

  const funnelQuery = useQuery({
    queryKey: ["funnel", channelId, id],
    queryFn: () => FunnelAPI.get(channelId!, id!),
    enabled: !!channelId && !!id,
  })
  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId,
  })

  if (!channelId || !id) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-500">Invalid channel or funnel id</div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (funnelQuery.isLoading) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Loading funnel…
      </div>
    )
  }

  if (funnelQuery.error) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">
          {toErrorMessage(funnelQuery.error)}
        </div>
        <button
          onClick={() =>
            navigate(`/channels/${channelId}/funnels`)
          }
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back to Funnels
        </button>
      </div>
    )
  }

  const funnel: FunnelDefinition | undefined = funnelQuery.data

  if (!funnel) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Funnel not found or not accessible
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            {funnel.name}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Funnel definition details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              navigate(`/channels/${channelId}/funnels`)
            }
            className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
          >
            Back to Funnels
          </button>
          <button
            onClick={() =>
              navigate(`/channels/${channelId}/funnels/new`)
            }
            className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
          >
            New Funnel
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold">
          Funnel Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Active Channel"
            value={
              channelQuery.data?.name ??
              channelId ??
              "—"
            }
          />
          <Field label="Funnel Name" value={funnel.name} />
          <Field
            label="Funnel ID"
            value={funnel.id}
            mono
            muted
          />
          <Field
            label="Created At"
            value={formatDate(funnel.createdAt)}
          />
          <Field
            label="Created By"
            value={funnel.createdBy}
            mono
            muted
          />
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold">
          Leads
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          This backend currently exposes funnel definition APIs
          only. Lead details can be shown here once lead APIs are
          available.
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  muted,
}: {
  label: string
  value: string
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)] mb-1">
        {label}
      </div>
      <div
        className={[
          mono ? "font-mono text-sm" : "",
          muted ? "text-zinc-500" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  )
}
