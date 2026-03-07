import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  ApiError,
  ChannelAPI,
  FunnelAPI,
  type FunnelDefinition,
} from "../lib/api"
import { useAuth } from "../context/AuthContext"
import type { DecodedActor } from "../lib/jwt"

function PermissionPanel({ actor }: { actor: DecodedActor }) {
  const hasFullAccess =
    actor.type === "ADMIN" ||
    (actor.permissionCodes?.includes("ADMIN_OVERRIDE") ?? false)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
      <h3 className="font-semibold mb-2">Your Permissions</h3>

      {hasFullAccess ? (
        <p className="text-sm text-emerald-400 font-semibold">ALL</p>
      ) : actor.permissionCodes && actor.permissionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actor.permissionCodes.map((p) => (
            <span
              key={p}
              className="px-2 py-1 text-xs rounded bg-zinc-800"
            >
              {p}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No permissions assigned</p>
      )}
    </div>
  )
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Not authorized to view funnels in this channel."
  }
  if (error instanceof Error) return error.message
  return "Failed to load dashboard"
}

export default function Dashboard() {
  const {
    actor,
    selectedChannelId,
    isAdmin,
    permissions,
  } = useAuth()
  const navigate = useNavigate()
  const canCreateFunnel =
    isAdmin ||
    permissions.includes("ADMIN_OVERRIDE") ||
    permissions.includes("CREATE_FUNNEL")

  const funnelsQuery = useQuery({
    queryKey: ["funnels", "channel", selectedChannelId],
    queryFn: () => FunnelAPI.list(selectedChannelId!),
    enabled: !!selectedChannelId,
  })
  const activeChannelQuery = useQuery({
    queryKey: ["channel", selectedChannelId],
    queryFn: () => ChannelAPI.get(selectedChannelId!),
    enabled: !!selectedChannelId,
  })

  if (!actor) {
    return <div>Please log in</div>
  }

  const funnels: FunnelDefinition[] = funnelsQuery.data ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      <PermissionPanel actor={actor} />

      {canCreateFunnel && (
        <button
          onClick={() =>
            selectedChannelId &&
            navigate(
              `/channels/${selectedChannelId}/funnels/new`
            )
          }
          disabled={!selectedChannelId}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
        >
          + Create Funnel
        </button>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="font-semibold mb-3">
          Recent Funnels
        </h3>

        {!selectedChannelId && (
          <p className="text-sm text-[var(--text-muted)]">
            Select a channel to view funnels.
          </p>
        )}

        {selectedChannelId && funnelsQuery.isLoading && (
          <p className="text-sm text-[var(--text-muted)]">Loading funnels...</p>
        )}

        {selectedChannelId && funnelsQuery.error && (
          <p className="text-sm text-red-500">
            {toErrorMessage(funnelsQuery.error)}
          </p>
        )}

        {selectedChannelId &&
          !funnelsQuery.isLoading &&
          !funnelsQuery.error && (
          <>
            {funnels.length === 0 ? (
              <p className="text-sm text-zinc-500">No funnels created yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[var(--text-muted)]">
                  <tr>
                    <th className="text-left py-1">ID</th>
                    <th className="text-left py-1">Name</th>
                    <th className="text-left py-1">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {funnels.slice(0, 5).map((f) => (
                    <tr
                      key={f.id}
                      className="border-t border-[var(--border)] cursor-pointer hover:bg-zinc-800"
                      onClick={() =>
                        navigate(
                          `/channels/${selectedChannelId}/funnels/${f.id}`
                        )
                      }
                    >
                      <td className="py-1 font-mono text-xs">{f.id.slice(-6)}</td>
                      <td className="py-1">{f.name}</td>
                      <td className="py-1">
                        {new Date(f.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] p-4 rounded">
          Active Channel:{" "}
          {activeChannelQuery.data?.name ??
            selectedChannelId ??
            "—"}
        </div>
        <div className="bg-[var(--bg-card)] p-4 rounded">
          Visible Funnels: {funnels.length}
        </div>
      </div>
    </div>
  )
}
