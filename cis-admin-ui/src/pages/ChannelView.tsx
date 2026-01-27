import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { ChannelAPI } from "../lib/api"
import type { Channel } from "../types/channel"

export default function ChannelView() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const [channel, setChannel] = useState<Channel | null>(null)

  useEffect(() => {
    if (!channelId) return
    ChannelAPI.get(channelId).then(setChannel)
  }, [channelId])

  if (!channel) {
    return <div className="text-[var(--text-muted)]">Loading…</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats */}
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

      {/* Metadata */}
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
