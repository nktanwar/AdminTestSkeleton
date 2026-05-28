import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { DealerAPI } from "../lib/api"

function formatDate(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString()
}

export default function DealerLeads() {
  const navigate = useNavigate()
  const leadsQuery = useQuery({
    queryKey: ["dealer-leads"],
    queryFn: DealerAPI.listLeads,
  })

  if (leadsQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Loading leads...
      </div>
    )
  }

  if (leadsQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {leadsQuery.error instanceof Error
          ? leadsQuery.error.message
          : "Failed to load leads."}
      </div>
    )
  }

  const leads = leadsQuery.data ?? []

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold tracking-tight">Assigned Leads</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          All leads below are already filtered by backend ownership rules.
        </p>
      </section>

      <div className="overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-4 font-medium">
                  {lead.customerSnapshot.name}
                </td>
                <td className="px-4 py-4">{lead.customerSnapshot.phone}</td>
                <td className="px-4 py-4">{lead.stage}</td>
                <td className="px-4 py-4">{lead.status}</td>
                <td className="px-4 py-4">{lead.source}</td>
                <td className="px-4 py-4">{formatDate(lead.createdAt)}</td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => navigate(`/dealer/leads/${lead.id}`)}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--accent-soft)]"
                  >
                    Open Details
                  </button>
                </td>
              </tr>
            ))}

            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  No leads are assigned to this dealer account yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
