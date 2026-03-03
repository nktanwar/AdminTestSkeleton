import { useEffect, useState } from "react"
import { getToken } from "../lib/auth"
import { ChannelAPI, ChannelMemberAPI } from "../lib/api"

/* ---------------------------------------------
   Types
---------------------------------------------- */
type ActorType = "ADMIN" | "CHANNEL_MEMBER"

interface DecodedActor {
  sub: string
  type: ActorType
  channelId?: string
  permissionCodes?: string[]
}

interface Channel {
  id: string
  name: string
  code: string
  status: string
}

interface ChannelMember {
  id: string
  name: string
  email: string
}

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082"

/* ---------------------------------------------
   JWT decode
---------------------------------------------- */
function decodeJwt(token: string): DecodedActor | null {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

/* ---------------------------------------------
   Component
---------------------------------------------- */
export default function DemoSwitch() {
  const [actor, setActor] = useState<DecodedActor | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ---------- Init ---------- */
  useEffect(() => {
    const token = getToken()
    if (!token) return
    setActor(decodeJwt(token))
  }, [])

  /* ---------- Load channel + members ---------- */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        const channels = await ChannelAPI.list()
        const active = channels.find(
          (c) => c.status === "ACTIVE"
        )

        if (!active) {
          throw new Error("No active channel found")
        }

        const members =
          await ChannelMemberAPI.list(active.id)

        if (members.length === 0) {
          throw new Error("No members in channel")
        }

        setChannel(active)
        setMembers(members)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  /* ---------- Guards ---------- */
  if (!actor) return <div>Please log in</div>
  if (loading) return <div>Loading demo data…</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (!channel || members.length === 0) return null

  const activeChannel = channel
  const primaryMember = members[0]
  const secondaryMember = members[1] ?? members[0]

  const isAdmin = actor.type === "ADMIN"

  function has(permission: string) {
    if (isAdmin) return true
    if(!actor)return false
    return actor.permissionCodes?.includes(permission) ?? false
  }

  /* ---------- Actions ---------- */

  async function createFunnel() {
    try {
      setBusy(true)

      const res = await fetch(
        `${BASE_URL}/internal/channels/${activeChannel.id}/funnels`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            ownerMemberId: primaryMember.id,
            source: "ONLINE",
            customerName: "Demo Customer",
            customerPhone: "9999999999",
            customerEmail: null,
          }),
        }
      )

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to create funnel")
      }

      alert("✅ Funnel created successfully")
    } catch (e: any) {
      alert(`❌ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function transferFunnel() {
    try {
      setBusy(true)

      const res = await fetch(
        `${BASE_URL}/internal/channels/${activeChannel.id}/funnels/ui`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )

      if (!res.ok) {
        throw new Error("Failed to load funnels")
      }

      const funnels = await res.json()

      if (!funnels.length) {
        alert("No funnels to transfer")
        return
      }

      const transferRes = await fetch(
        `${BASE_URL}/internal/channels/${activeChannel.id}/funnels/${funnels[0].id}/transfer?newOwnerMemberId=${secondaryMember.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )

      if (!transferRes.ok) {
        const text = await transferRes.text()
        throw new Error(text || "Transfer failed")
      }

      alert("✅ Funnel transferred successfully")
    } catch (e: any) {
      alert(`❌ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function assignWork() {
    try {
      setBusy(true)

      const res = await fetch(
        `${BASE_URL}/internal/channels/${activeChannel.id}/funnels/ui`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )

      if (!res.ok) {
        throw new Error("Failed to load funnels")
      }

      const funnels = await res.json()

      if (!funnels.length) {
        alert("No funnels available")
        return
      }

      const workRes = await fetch(
        `${BASE_URL}/internal/work`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            funnelId: funnels[0].id,
            channelId: activeChannel.id,
            assignedToMemberId: primaryMember.id,
            type: "TASK",
          }),
        }
      )

      if (!workRes.ok) {
        const text = await workRes.text()
        throw new Error(text || "Work assignment failed")
      }

      alert("✅ Work assigned successfully")
    } catch (e: any) {
      alert(`❌ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  /* ---------- UI ---------- */

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">
        CRM Permission Demo
      </h1>

      <div className="text-sm text-[var(--text-muted)]">
        Channel: <b>{activeChannel.name}</b>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Actions</h2>

        <ActionRow
          label="Create Funnel"
          visible={has("CREATE_FUNNEL")}
          disabled={busy}
          onClick={createFunnel}
        />

        <ActionRow
          label="Transfer Funnel"
          visible={has("TRANSFER_WORK")}
          disabled={busy}
          onClick={transferFunnel}
        />

        <ActionRow
          label="Assign Work"
          visible={has("WORK_ASSIGN")}
          disabled={busy}
          onClick={assignWork}
        />
      </div>
    </div>
  )
}

/* ---------------------------------------------
   ActionRow
---------------------------------------------- */
function ActionRow({
  label,
  visible,
  disabled,
  onClick,
}: {
  label: string
  visible: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`text-sm ${
          visible ? "text-zinc-200" : "text-zinc-500"
        }`}
      >
        {label}
      </span>

      {visible ? (
        <button
          disabled={disabled}
          onClick={onClick}
          className={`px-4 py-1.5 rounded text-sm font-medium ${
            disabled
              ? "bg-zinc-700 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          Execute
        </button>
      ) : (
        <span className="text-xs text-zinc-500">
          Not permitted
        </span>
      )}
    </div>
  )
}
