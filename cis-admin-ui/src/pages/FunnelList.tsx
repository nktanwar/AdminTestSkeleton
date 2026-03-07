import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { FunnelAPI } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { mockLeads } from "../mock/data"

export default function FunnelList() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const canCreateFunnel = isAdmin

  const funnelsQuery = useQuery({
    queryKey: ["funnels", "summary", channelId],
    queryFn: () => FunnelAPI.list(channelId!),
    enabled: !!channelId,
  })

  const funnels = funnelsQuery.data ?? []

  // Count leads per funnel
  const getLeadCountByStage = (funnelId: string) => {
    const funnelLeads = mockLeads.filter((l) => l.funnelId === funnelId)
    const stages = new Set(funnelLeads.map((l) => l.stage))
    const counts = Array.from(stages).map((stage) => {
      const count = funnelLeads.filter((l) => l.stage === stage).length
      return `${stage} (${count})`
    })
    return counts.join(" | ")
  }

  const getTotalLeadCount = (funnelId: string) => {
    return mockLeads.filter((l) => l.funnelId === funnelId).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Funnels</h2>
        {canCreateFunnel && (
          <button
            onClick={() => navigate(`/channels/${channelId}/funnels/new`)}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
          >
            + Create Funnel
          </button>
        )}
      </div>

      {funnelsQuery.isLoading && (
        <p className="text-[var(--text-muted)]">Loading funnels...</p>
      )}

      {funnelsQuery.error && (
        <p className="text-red-500">Failed to load funnels</p>
      )}

      {!funnelsQuery.isLoading && !funnelsQuery.error && funnels.length === 0 && (
        <p className="text-[var(--text-muted)]">No funnels created yet</p>
      )}

      {!funnelsQuery.isLoading &&
        !funnelsQuery.error &&
        funnels.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {funnels.map((funnel) => (
              <div
                key={funnel.id}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 hover:border-emerald-600 transition cursor-pointer"
                onClick={() =>
                  navigate(`/channels/${channelId}/funnels/${funnel.id}`)
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{funnel.channelName}</h3>
                  <span className="text-sm bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded">
                    {getTotalLeadCount(funnel.id)} leads
                  </span>
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-3">
                  Owner: {funnel.channelName}
                </p>

                <div className="text-sm text-[var(--text-muted)] bg-[var(--bg-subtle)] p-3 rounded">
                  {getLeadCountByStage(funnel.id) || "No leads yet"}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/channels/${channelId}/funnels/${funnel.id}`)
                    }}
                    className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
