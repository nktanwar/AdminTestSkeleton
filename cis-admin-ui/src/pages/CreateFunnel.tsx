import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ApiError,
  FunnelAPI,
  ChannelAPI,
  type FunnelDefinition,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unable to create funnel"
}

export default function CreateFunnel() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { channelId: routeChannelId } = useParams()
  const { selectedChannelId, isAdmin, permissions } = useAuth()
  const channelId = routeChannelId ?? selectedChannelId ?? null
  const canCreateFunnel =
    isAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    permissions.includes("CREATE_FUNNEL")

  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId,
  })

  const [funnelName, setFunnelName] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!canCreateFunnel) {
      setError("Not authorized to create funnel")
      return
    }

    if (!channelId) {
      setError("No active channel selected")
      return
    }
    if (!funnelName.trim()) {
      setError("Funnel name is required")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const created = await FunnelAPI.create(channelId, {
        name: funnelName.trim(),
      })
      queryClient.setQueryData<FunnelDefinition[]>(
        ["funnels", "channel", channelId],
        (current) => {
          if (!current) return [created]
          return [
            created,
            ...current.filter(
              (funnel) => funnel.id !== created.id
            ),
          ]
        }
      )
      await queryClient.invalidateQueries({
        queryKey: ["funnels", "channel", channelId],
      })

      navigate(`/channels/${channelId}/funnels`)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        setError("Not authorized to create funnel")
      } else {
        setError(toErrorMessage(error))
      }
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

      {!canCreateFunnel && (
        <div className="text-sm text-red-400">
          You do not have permission to create funnels in this channel.
        </div>
      )}

      {/* Assignment */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm">Funnel Setup</h3>
        <div className="text-xs text-zinc-400 mb-1">
          Channel
        </div>
        <div className="px-3 py-2 bg-zinc-800 rounded">
          {channelQuery.data?.name ??
            channelId ??
            "No active channel"}
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-1">
            Funnel Name
          </div>
          <input
            value={funnelName}
            onChange={e => setFunnelName(e.target.value)}
            placeholder="Enter funnel name"
            className="w-full px-3 py-2 bg-zinc-800 rounded"
          />
        </div>
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
          disabled={
            loading ||
            !canCreateFunnel ||
            !funnelName.trim()
          }
          onClick={submit}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Funnel"}
        </button>
      </div>
    </div>
  )
}
