import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FunnelAPI, ChannelAPI, ChannelMemberAPI } from "../lib/api"

interface Channel {
  id: string
  name: string
}

interface Member {
  id: string
  name: string
}

export default function CreateFunnel() {
  const navigate = useNavigate()

  const [channels, setChannels] = useState<Channel[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const [channelId, setChannelId] = useState("")
  const [ownerMemberId, setOwnerMemberId] = useState("")

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Load channels */
  useEffect(() => {
    ChannelAPI.list().then(setChannels)
  }, [])

  /* Load members when channel changes */
  useEffect(() => {
    if (!channelId) return
    ChannelMemberAPI.list(channelId).then(setMembers)
  }, [channelId])

  async function submit() {
    setError(null)
    setLoading(true)

    try {
      await FunnelAPI.create({
        channelId,
        ownerMemberId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        source: "ADMIN",
      })

      navigate("/") // back to dashboard
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Create Funnel</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Back
        </button>
      </div>

      {/* Customer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm">Customer Details</h3>

        <Input label="Name" value={customerName} onChange={setCustomerName} />
        <Input label="Phone" value={customerPhone} onChange={setCustomerPhone} />
        <Input
          label="Email (optional)"
          value={customerEmail}
          onChange={setCustomerEmail}
        />
      </div>

      {/* Assignment */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm">Assignment</h3>

        <Select
          label="Channel"
          value={channelId}
          onChange={setChannelId}
          options={channels.map(c => ({
            value: c.id,
            label: c.name,
          }))}
        />

        <Select
          label="Owner"
          value={ownerMemberId}
          onChange={setOwnerMemberId}
          options={members.map(m => ({
            value: m.id,
            label: m.name,
          }))}
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
        >
          Cancel
        </button>

        <button
          disabled={loading}
          onClick={submit}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Funnel"}
        </button>
      </div>
    </div>
  )
}

/* ---------- Small helpers ---------- */

function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 rounded"
      />
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 rounded"
      >
        <option value="">Select</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
