import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import {
  ApiError,
  FunnelAPI,
  type FunnelDefinition,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { canViewFunnels } from "../lib/access"

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Not authorized to view funnels in this channel."
  }

  if (error instanceof Error) return error.message
  return "Failed to load funnels"
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value

  return new Date(timestamp).toLocaleString()
}

export default function ChannelFunnels() {
  const { channelId } = useParams<{
    channelId: string
  }>()
  const navigate = useNavigate()
  const { isAdmin, permissions } = useAuth()
  const canViewFunnelsInChannel = canViewFunnels(
    isAdmin,
    permissions
  )
  const canCreateFunnel =
    isAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    permissions.includes("CREATE_FUNNEL")

  const funnelsQuery = useQuery({
    queryKey: ["funnels", "channel", channelId],
    queryFn: () => FunnelAPI.list(channelId!),
    enabled: !!channelId && canViewFunnelsInChannel,
  })

  if (!channelId) {
    return (
      <div className="text-red-500">
        Invalid channel id
      </div>
    )
  }

  const funnels: FunnelDefinition[] = funnelsQuery.data ?? []

  if (!canViewFunnelsInChannel) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Funnels</h2>
        <p className="text-sm text-[var(--text-muted)]">
          You are not allowed to view funnels for this channel.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Assigned leads (if any) are available in channel dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Funnels</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Manage all funnels for this channel.
          </p>
        </div>

        <button
          onClick={() =>
            navigate(`/channels/${channelId}/funnels/new`)
          }
          disabled={!canCreateFunnel}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          + Create Funnel
        </button>
      </div>

      {!canCreateFunnel && (
        <p className="text-sm text-[var(--text-muted)]">
          You can view funnels but cannot create new ones.
        </p>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        {funnelsQuery.isLoading && (
          <div className="p-4 text-[var(--text-muted)]">
            Loading funnels...
          </div>
        )}

        {funnelsQuery.error && (
          <div className="p-4 text-red-500">
            {toErrorMessage(funnelsQuery.error)}
          </div>
        )}

        {!funnelsQuery.isLoading &&
          !funnelsQuery.error &&
          funnels.length === 0 && (
          <div className="p-6 space-y-3">
            <p className="text-[var(--text-muted)]">
              No funnels created for this channel yet.
            </p>
            {canCreateFunnel && (
              <button
                onClick={() =>
                  navigate(
                    `/channels/${channelId}/funnels/new`
                  )
                }
                className="px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--accent-soft)] text-sm"
              >
                Create the first funnel
              </button>
            )}
          </div>
        )}

        {!funnelsQuery.isLoading &&
          !funnelsQuery.error &&
          funnels.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-[var(--text-muted)]">
              <tr>
                <th className="text-left px-4 py-3">Funnel</th>
                <th className="text-left px-4 py-3">Created At</th>
                <th className="text-left px-4 py-3">Created By</th>
              </tr>
            </thead>
            <tbody>
              {funnels.map((funnel) => (
                <tr
                  key={funnel.id}
                  onClick={() =>
                    navigate(
                      `/channels/${channelId}/funnels/${funnel.id}`
                    )
                  }
                  className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--accent-soft)]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {funnel.name}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">
                      {funnel.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(funnel.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {funnel.createdBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
