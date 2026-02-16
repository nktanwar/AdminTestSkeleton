import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

/* ---------- Page ---------- */

export default function Members() {
  const { channelId } = useParams<{ channelId: string }>()

  if (!channelId) {
    return <div className="text-red-400">Invalid channel</div>
  }

  const [showModal, setShowModal] = useState(false)

  const membersQuery = useQuery({
    queryKey: ["channelMembers", channelId],
    queryFn: () => ChannelMemberAPI.list(channelId),
  })

  const members = (membersQuery.data ?? []) as Member[]

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

      {membersQuery.isLoading && (
        <div className="text-sm text-[var(--text-muted)]">Loading members…</div>
      )}

      {membersQuery.error && (
        <div className="text-sm text-red-400">
          {toErrorMessage(membersQuery.error)}
        </div>
      )}

      {!membersQuery.isLoading && !membersQuery.error && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
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
                  className="border-b border-[var(--border)] hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{m.email}</td>
                  <td className="px-4 py-3">
                    <LevelBadge level={m.level} />
                  </td>
                  <td className="px-4 py-3">{m.permissionSet}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[var(--text-muted)] hover:text-white text-xs">
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
