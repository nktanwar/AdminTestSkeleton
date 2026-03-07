import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ApiError, FunnelAPI, type FunnelUi } from "../lib/api"

interface LeadRecord {
  id: string
  name: string
  phone: string
  email: string | null
  stage: string
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Not authorized to view this funnel."
  }

  if (error instanceof Error) return error.message
  return "Failed to load funnel"
}

function stageClass(stage: string): string {
  const normalized = stage.toUpperCase()

  if (normalized.includes("NEW")) {
    return "bg-sky-500/20 text-sky-300"
  }
  if (normalized.includes("WON")) {
    return "bg-emerald-500/20 text-emerald-300"
  }
  if (
    normalized.includes("LOST") ||
    normalized.includes("CLOSED")
  ) {
    return "bg-rose-500/20 text-rose-300"
  }

  return "bg-[var(--accent-soft)] text-[var(--accent)]"
}

export default function FunnelView() {
  const { channelId, id } = useParams<{
    channelId: string
    id: string
  }>()
  const navigate = useNavigate()
  const [selectedLeadId, setSelectedLeadId] = useState<
    string | null
  >(null)

  const funnelQuery = useQuery({
    queryKey: ["funnel", channelId, id],
    queryFn: () => FunnelAPI.getUi(channelId!, id!),
    enabled: !!channelId && !!id,
  })

  if (!channelId || !id) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-500">Invalid channel or funnel id</div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (funnelQuery.isLoading) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Loading funnel…
      </div>
    )
  }

  if (funnelQuery.error) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">
          {toErrorMessage(funnelQuery.error)}
        </div>
        <button
          onClick={() =>
            navigate(`/channels/${channelId}/funnels`)
          }
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← Back to Funnels
        </button>
      </div>
    )
  }

  const funnel: FunnelUi | undefined = funnelQuery.data

  if (!funnel) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Funnel not found or not accessible
      </div>
    )
  }

  const fallbackLead: LeadRecord = {
    id: funnel.id,
    name: funnel.customerName,
    phone: funnel.customerPhone,
    email: funnel.customerEmail ?? null,
    stage: funnel.stage,
  }
  const apiLeads = (
    funnel as FunnelUi & {
      leads?: unknown
    }
  ).leads
  const parsedLeadList: LeadRecord[] =
    Array.isArray(apiLeads) && apiLeads.length > 0
      ? apiLeads
          .map((entry, index) => {
            if (!entry || typeof entry !== "object") {
              return null
            }
            const lead = entry as {
              id?: unknown
              name?: unknown
              customerName?: unknown
              phone?: unknown
              customerPhone?: unknown
              email?: unknown
              customerEmail?: unknown
              stage?: unknown
            }

            const name =
              typeof lead.name === "string"
                ? lead.name
                : typeof lead.customerName === "string"
                  ? lead.customerName
                  : fallbackLead.name
            const phone =
              typeof lead.phone === "string"
                ? lead.phone
                : typeof lead.customerPhone === "string"
                  ? lead.customerPhone
                  : fallbackLead.phone
            const email =
              typeof lead.email === "string" ||
              lead.email === null
                ? lead.email
                : typeof lead.customerEmail === "string" ||
                    lead.customerEmail === null
                  ? lead.customerEmail
                  : fallbackLead.email
            const stage =
              typeof lead.stage === "string"
                ? lead.stage
                : fallbackLead.stage

            return {
              id:
                typeof lead.id === "string"
                  ? lead.id
                  : `${fallbackLead.id}-${index + 1}`,
              name,
              phone,
              email,
              stage,
            }
          })
          .filter(
            (lead): lead is LeadRecord => lead !== null
          )
      : [fallbackLead]
  const leadList: LeadRecord[] =
    parsedLeadList.length > 0
      ? parsedLeadList
      : [fallbackLead]
  const selectedLead =
    leadList.find((lead) => lead.id === selectedLeadId) ??
    leadList[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            Funnel {funnel.id.slice(-6)}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Dedicated funnel workspace with settings and leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              navigate(`/channels/${channelId}/funnels`)
            }
            className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
          >
            Back to Funnels
          </button>
          <button
            onClick={() =>
              navigate(`/channels/${channelId}/funnels/new`)
            }
            className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
          >
            New Funnel
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold">
          Funnel Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Channel" value={funnel.channelName} />
          <Field label="Owner" value={funnel.ownerName} />
          <Field
            label="Funnel ID"
            value={funnel.id}
            mono
            muted
          />
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">
              Stage
            </div>
            <span
              className={`inline-flex px-2 py-1 rounded text-xs ${stageClass(
                funnel.stage
              )}`}
            >
              {funnel.stage}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold">Leads in Funnel</h3>
          <span className="text-xs text-[var(--text-muted)]">
            {leadList.length} lead
            {leadList.length === 1 ? "" : "s"}
          </span>
        </div>

        <table className="w-full text-sm">
          <thead className="text-[var(--text-muted)]">
            <tr>
              <th className="text-left px-5 py-3">Lead</th>
              <th className="text-left px-5 py-3">Contact</th>
              <th className="text-left px-5 py-3">Stage</th>
            </tr>
          </thead>
          <tbody>
            {leadList.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`border-t border-[var(--border)] ${
                  selectedLead?.id === lead.id
                    ? "bg-[var(--accent-soft)]"
                    : "hover:bg-[var(--accent-soft)]"
                }`}
              >
                <td className="px-5 py-3">
                  <div className="font-medium">{lead.name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-mono">
                    {lead.id}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div>{lead.phone}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {lead.email ?? "No email"}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs ${stageClass(
                      lead.stage
                    )}`}
                  >
                    {lead.stage}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold">
          Lead Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" value={selectedLead.name} />
          <Field
            label="Phone Number"
            value={selectedLead.phone}
          />
          <Field
            label="Email"
            value={selectedLead.email ?? "Not provided"}
          />
          <Field
            label="Lead/Funnel Ref"
            value={selectedLead.id}
            mono
            muted
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <a
            href={`tel:${selectedLead.phone}`}
            className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
          >
            Call Lead
          </a>
          {selectedLead.email && (
            <a
              href={`mailto:${selectedLead.email}`}
              className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
            >
              Email Lead
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

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
