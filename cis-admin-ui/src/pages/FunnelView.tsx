import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { FunnelAPI, type FunnelUi } from "../lib/api"

/* ---------------------------------------------
   Component
---------------------------------------------- */
export default function FunnelView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [funnel, setFunnel] = useState<FunnelUi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ---------- Load funnel (UI endpoint) ---------- */
  useEffect(() => {
    if (!id) {
      setError("Invalid funnel id")
      setLoading(false)
      return
    }

    FunnelAPI.getUi(id)
      .then(setFunnel)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  /* ---------- Guards ---------- */
  if (loading) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Loading funnel…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-500">{error}</div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (!funnel) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Funnel not found or not accessible
      </div>
    )
  }

  /* ---------- UI ---------- */
  return (
    <div className="space-y-6 max-w-xl p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Funnel Details
        </h1>

        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back
        </button>
      </div>

      {/* Funnel summary */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-4">
        <Field label="Stage" value={funnel.stage} badge />

        <Field label="Channel" value={funnel.channelName} />
        <Field label="Owner" value={funnel.ownerName} />

        <Field
          label="Funnel ID"
          value={funnel.id}
          mono
          muted
        />
      </div>

      {/* Customer snapshot */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm text-zinc-300">
          Customer
        </h3>

        <Field label="Name" value={funnel.customerName} />
        <Field label="Phone" value={funnel.customerPhone} />

        {funnel.customerEmail && (
          <Field
            label="Email"
            value={funnel.customerEmail}
          />
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------
   Field helper
---------------------------------------------- */
function Field({
  label,
  value,
  mono,
  badge,
  muted,
}: {
  label: string
  value: string
  mono?: boolean
  badge?: boolean
  muted?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)] mb-1">
        {label}
      </div>

      {badge ? (
        <span className="inline-block px-2 py-1 text-xs rounded bg-emerald-700">
          {value}
        </span>
      ) : (
        <div
          className={[
            mono ? "font-mono text-sm" : "",
            muted ? "text-zinc-500" : "",
          ].join(" ")}
        >
          {value}
        </div>
      )}
    </div>
  )
}
