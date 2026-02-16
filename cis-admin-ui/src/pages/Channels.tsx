import { useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { Channel } from "../types/channel"
import { ChannelAPI } from "../lib/api"
import CreateChannelModal from "../components/CreateChannelModal"
import { useNavigate } from "react-router-dom"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

export default function Channels() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: ChannelAPI.list,
  })

  const createChannelMutation = useMutation({
    mutationFn: (input: { name: string; code: string }) =>
      ChannelAPI.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<Channel[]>(
        ["channels"],
        (prev) => [...(prev ?? []), created]
      )
      setShowCreate(false)
    },
  })

  const deactivateChannelMutation = useMutation({
    mutationFn: (id: string) => ChannelAPI.deactivate(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<Channel[]>(
        ["channels"],
        (prev) =>
          (prev ?? []).map((c) =>
            c.id === updated.id ? updated : c
          )
      )
    },
  })

  async function createChannel(input: {
    name: string
    code: string
  }) {
    try {
      await createChannelMutation.mutateAsync(input)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function deactivateChannel(id: string) {
    if (!confirm("Freeze this channel?")) return

    try {
      await deactivateChannelMutation.mutateAsync(id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (channelsQuery.isLoading) {
    return <div>Loading channels...</div>
  }
  if (channelsQuery.error) {
    return (
      <div className="text-red-500">
        {toErrorMessage(channelsQuery.error)}
      </div>
    )
  }

  const channels = channelsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Channels</h1>
        <button
          onClick={() => setShowCreate(true)}
          disabled={createChannelMutation.isPending}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
        >
          + Create Channel
        </button>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-300">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {channels.map((c) => (
              <tr
                key={c.id}
                className="border-t border-[var(--border)]"
              >
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 font-mono">{c.code}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      c.status === "ACTIVE"
                        ? "bg-emerald-700"
                        : "bg-zinc-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>

                <td className="px-4 py-2 text-right space-x-2">
                  {/* PRIMARY */}
                  <button
                    onClick={() =>
                      navigate(`/channels/${c.id}`)
                    }
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-medium"
                  >
                    View
                  </button>

                  {/* SECONDARY / DESTRUCTIVE */}
                  {c.status === "ACTIVE" ? (
                    <button
                      onClick={() =>
                        deactivateChannel(c.id)
                      }
                      disabled={deactivateChannelMutation.isPending}
                      className="text-red-500 hover:text-red-400 text-xs"
                    >
                      Freeze
                    </button>
                  ) : (
                    <span className="text-zinc-500 text-xs">
                      Frozen
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreate={createChannel}
        />
      )}
    </div>
  )
}
