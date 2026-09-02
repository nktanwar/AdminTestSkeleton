import { useQuery } from "@tanstack/react-query"
import { DealerAPI } from "../lib/api"
import { toUserFacingErrorMessage } from "../lib/errors"

function formatDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

export default function DealerKnowledgeCenters() {
  const knowledgeCentersQuery = useQuery({
    queryKey: ["dealer-knowledge-centers"],
    queryFn: DealerAPI.listKnowledgeCenters,
  })

  if (knowledgeCentersQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Loading knowledge centers...
      </div>
    )
  }

  if (knowledgeCentersQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {knowledgeCentersQuery.error instanceof Error
          ? toUserFacingErrorMessage(knowledgeCentersQuery.error)
          : "Failed to load knowledge centers."}
      </div>
    )
  }

  const knowledgeCenters = knowledgeCentersQuery.data ?? []

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold tracking-tight">
          Knowledge Centers
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Backend access rules are already applied, so this list only contains
          centers available to your account.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {knowledgeCenters.map((center) => (
          <article
            key={center.id}
            className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{center.name}</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {center.description?.trim() || "No description available."}
                </p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {center.status}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4 text-sm text-[var(--text-muted)]">
              Created: {formatDate(center.createdAt)}
            </div>
          </article>
        ))}
      </div>

      {knowledgeCenters.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          No knowledge centers are available for this dealer account.
        </div>
      )}
    </div>
  )
}
