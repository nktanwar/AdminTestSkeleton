import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChannelAPI } from "../lib/api"
import type { Channel } from "../types/channel"

export default function ChannelView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    ChannelAPI.get(id)
      .then(setChannel)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div>Loading…</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (!channel) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Channel Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
<Field label="Name" value={channel.name} />
<Field label="Code" value={channel.code} mono />
<Field label="Status" value={channel.status} />

<Field
  label="Wallet Enabled"
  value={channel.walletEnabled ? "Yes" : "No"}
/>

<Field
  label="Knowledge Center Access"
  value={channel.knowledgeCenterAccess ? "Yes" : "No"}
/>

<Field
  label="Created At"
  value={channel.createdAt ?? "—"}
/>

{channel.updatedAt && (
  <Field label="Updated At" value={channel.updatedAt} />
)}

      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className={mono ? "font-mono" : ""}>{value}</div>
    </div>
  )
}
