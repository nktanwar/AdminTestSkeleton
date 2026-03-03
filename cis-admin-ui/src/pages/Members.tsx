import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  ChannelMemberAPI,
  type AddChannelMemberPayload,
  PermissionAPI,
  type PermissionSet,
} from "../lib/api"
import AddChannelMemberModal from "../components/AddChannelMemberModal"
import { useAuth } from "../context/AuthContext"

/* ---------- Types ---------- */

type MemberStatus = "ACTIVE" | "DEACTIVATED"

interface Member {
  id: string
  name: string
  email: string
  userId: string | null
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
  const { capabilities, capabilitiesLoading } = useAuth()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)

  const membersQuery = useQuery({
    queryKey: ["channelMembers", channelId],
    queryFn: () => ChannelMemberAPI.list(channelId!),
    enabled: !!channelId && capabilities.canViewMembers,
  })

  const addMemberMutation = useMutation({
    mutationFn: (payload: AddChannelMemberPayload) =>
      ChannelMemberAPI.addMember(channelId!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["channelMembers", channelId],
      })
    },
  })

  const permissionSetsQuery = useQuery({
    queryKey: ["permissionSets", channelId, "members-page"],
    queryFn: () => PermissionAPI.listSets(channelId!),
    enabled: !!channelId && capabilities.canAddMember,
  })

  const members = (membersQuery.data ?? []) as Member[]
  const permissionSets = (permissionSetsQuery.data ??
    []) as PermissionSet[]
  const hasPermissionSets = permissionSets.length > 0

  if (!channelId) {
    return <div className="text-red-400">Invalid channel</div>
  }

  if (capabilitiesLoading) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        Loading channel permissions...
      </div>
    )
  }

  if (!capabilities.canViewMembers) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        You do not have permission to view members in this channel.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        {capabilities.canAddMember && (
          <button
            onClick={() => setShowModal(true)}
            disabled={
              permissionSetsQuery.isLoading ||
              !hasPermissionSets
            }
            className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-medium"
          >
            + Add Member
          </button>
        )}
      </div>

      {capabilities.canAddMember &&
        permissionSetsQuery.error && (
          <div className="text-sm text-red-400">
            Could not load permission sets. Add Member is disabled.
          </div>
        )}

      {capabilities.canAddMember &&
        !permissionSetsQuery.isLoading &&
        !permissionSetsQuery.error &&
        !hasPermissionSets && (
          <div className="text-sm text-amber-300">
            Please create a permission set before adding members.
          </div>
        )}

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
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {m.userId === null && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-900/70 text-amber-200 border border-amber-700/60">
                          External
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{m.email}</td>
                  <td className="px-4 py-3">{m.permissionSet}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.userId ? (
                      <button className="text-[var(--text-muted)] hover:text-white text-xs">
                        View Profile
                      </button>
                    ) : (
                      <span className="text-zinc-500 text-xs">
                        No login actions
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
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
      {showModal && capabilities.canAddMember && (
        <AddChannelMemberModal
          onClose={() => setShowModal(false)}
          permissionSets={permissionSets}
          onSubmit={async (payload) => {
            await addMemberMutation.mutateAsync(payload)
          }}
          submitting={addMemberMutation.isPending}
          error={
            addMemberMutation.error
              ? toErrorMessage(addMemberMutation.error)
              : null
          }
        />
      )}
    </div>
  )
}

/* ---------- UI helpers ---------- */

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
