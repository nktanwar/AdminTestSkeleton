import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { ChannelMemberAPI } from "../lib/api"
import AddChannelMemberModal from "../components/AddChannelMemberModal"

/* ---------- Types ---------- */

type MemberStatus = "ACTIVE" | "DEACTIVATED"

interface Member {
  id: string
  name: string
  email: string
  level: string
  permissionSet: string
  status: MemberStatus
}

/* ---------- Page ---------- */

export default function Members() {
  const { channelId } = useParams<{ channelId: string }>()

  if (!channelId) {
    return <div className="text-red-400">Invalid channel</div>
  }

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  /* ---------- Load members ---------- */
  useEffect(() => {
    setLoading(true)
    setError(null)

    ChannelMemberAPI.list(channelId)
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [channelId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-medium"
        >
          + Add Member
        </button>
      </div>

      {loading && (
        <div className="text-sm text-zinc-400">Loading members…</div>
      )}

      {error && (
        <div className="text-sm text-red-400">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Level</th>
                <th className="text-left px-4 py-3">Permission Set</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-zinc-800 hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{m.email}</td>
                  <td className="px-4 py-3">
                    <LevelBadge level={m.level} />
                  </td>
                  <td className="px-4 py-3">{m.permissionSet}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-zinc-400 hover:text-white text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-zinc-500"
                  >
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Add Members Modal ---------- */}
      {showModal && (
        <AddChannelMemberModal
          onClose={() => setShowModal(false)}
          onConfirm={(users) => {
            // ⛔ TEMP: backend wiring comes next
            console.log("Selected users for channel:", channelId, users)

            // later this will call:
            // ChannelMemberAPI.add(channelId, { userIds, levelId })

            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

/* ---------- UI helpers ---------- */

function LevelBadge({ level }: { level: string }) {
  return (
    <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
      {level}
    </span>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        status === "ACTIVE"
          ? "bg-emerald-900 text-emerald-300"
          : "bg-zinc-700 text-zinc-300"
      }`}
    >
      {status}
    </span>
  )
}
