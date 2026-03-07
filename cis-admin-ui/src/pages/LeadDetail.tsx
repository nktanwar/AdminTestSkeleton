import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { LeadAPI } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { StageBadge } from "../components/StageBadge"
import { LeadContactModal } from "../components/LeadContactModal"
import { mockLeads } from "../mock/data"
import { useState } from "react"
import type { LeadStage } from "../types/lead"

// Fallback function if date-fns is not available
function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function LeadDetail() {
  const { channelId, id, leadId } = useParams()
  const navigate = useNavigate()
  const { userId, capabilities } = useAuth()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<LeadStage | "">("")
  const [isUpdatingStage, setIsUpdatingStage] = useState(false)

  // Fetch lead detail
  const leadQuery = useQuery({
    queryKey: ["lead", channelId, id, leadId],
    queryFn: () =>
      LeadAPI.getDetail(channelId!, id!, leadId!),
    enabled: !!channelId && !!id && !!leadId,
  })

  // Use mock data if API fails
  const lead = leadQuery.data ?? mockLeads.find((l) => l.id === leadId)

  if (leadQuery.isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">Loading lead details...</p>
      </div>
    )
  }

  if (leadQuery.error || !lead) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">
          {leadQuery.error instanceof Error
            ? leadQuery.error.message
            : "Lead not found"}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600"
        >
          Go Back
        </button>
      </div>
    )
  }

  const isAssignedToMe = lead.assignedTo === userId
  const canUpdateStage = capabilities?.canUpdateChannel || isAssignedToMe

  const handleStageChange = async (newStage: LeadStage) => {
    try {
      setIsUpdatingStage(true)
      await LeadAPI.updateStage(
        channelId!,
        id!,
        leadId!,
        newStage
      )
      // Refresh lead data
      await leadQuery.refetch()
      setSelectedStage("")
    } catch (error) {
      console.error("Failed to update stage:", error)
    } finally {
      setIsUpdatingStage(false)
    }
  }

  const handleSaveContact = async (data: {
    method: "CALL" | "EMAIL" | "MEETING" | "OTHER"
    response: "POSITIVE" | "NEGATIVE" | "NO_RESPONSE" | "PENDING"
    notes?: string
  }) => {
    try {
      await LeadAPI.addContactNote(
        channelId!,
        id!,
        leadId!,
        data
      )
      await leadQuery.refetch()
    } catch (error) {
      console.error("Failed to save contact:", error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Lead Header Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">{lead.name}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {lead.source}
              {lead.source === "ONLINE" && " • Web"}
              {lead.source === "OFFLINE" && " • Offline"}
              {lead.source === "ADMIN" && " • Admin"}
            </p>
          </div>
          <StageBadge stage={lead.stage} size="lg" />
        </div>

        {/* Lead Info Grid */}
        <div className="grid grid-cols-2 gap-4 bg-[var(--bg-subtle)] p-4 rounded">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
              Email
            </p>
            <p className="text-sm">{lead.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
              Phone
            </p>
            <p className="text-sm">{lead.phone}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
              Assigned To
            </p>
            <p className="text-sm">{lead.assignedToName || lead.assignedTo}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
              Created
            </p>
            <p className="text-sm">
              {formatDistanceToNow(new Date(lead.createdAt))} ago
            </p>
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <div className="mt-4 p-3 bg-zinc-700/30 rounded border border-zinc-600/50">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-sm text-[var(--text-muted)]">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Stage Change Card */}
      {canUpdateStage && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Change Stage</h3>
          <div className="flex gap-2 items-center">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as LeadStage | "")}
              disabled={isUpdatingStage}
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm"
            >
              <option value="">Select new stage...</option>
              {Object.values(lead.stage as any).length > 0 &&
                [
                  "NEW",
                  "CONTACTED",
                  "QUALIFIED",
                  "QUOTED",
                  "ORDER_PLACED",
                  "ORDER_COMPLETED",
                  "DROPPED",
                  "CLOSED",
                ].map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
            </select>
            <button
              onClick={() => {
                if (selectedStage && selectedStage !== lead.stage) {
                  handleStageChange(selectedStage as LeadStage)
                }
              }}
              disabled={!selectedStage || selectedStage === lead.stage || isUpdatingStage}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm"
            >
              {isUpdatingStage ? "Updating..." : "Update Stage"}
            </button>
          </div>
        </div>
      )}

      {/* Contact Action */}
      {isAssignedToMe && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Log Contact</h3>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
          >
            + Log Contact
          </button>
        </div>
      )}

      {/* Stage History Timeline */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Stage Timeline</h3>

        {lead.stageHistory.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">No stage changes yet</p>
        ) : (
          <div className="space-y-4">
            {/* Initial state */}
            <div className="flex gap-4">
              <div className="w-24 flex-shrink-0 pt-2">
                <p className="text-xs text-[var(--text-muted)]">
                  {formatDistanceToNow(new Date(lead.createdAt))} ago
                </p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-zinc-600"></span>
                  <p className="font-medium text-sm">Created</p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Lead created from {lead.source}
                </p>
              </div>
            </div>

            {/* Stage changes */}
            {lead.stageHistory.map((change, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-24 flex-shrink-0 pt-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDistanceToNow(new Date(change.changedAt))} ago
                  </p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-600"></span>
                    <p className="font-medium text-sm">
                      {change.from} → {change.to}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    by {change.changedByName || change.changedBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact History */}
      {lead.contactHistory && lead.contactHistory.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-6">Contact History</h3>
          <div className="space-y-4">
            {lead.contactHistory.map((contact) => (
              <div
                key={contact.id}
                className="flex gap-4 p-4 bg-[var(--bg-subtle)] rounded border border-[var(--border)]"
              >
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-400">
                    {contact.method}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">
                      {contact.response === "POSITIVE" && "✓ Positive Response"}
                      {contact.response === "NEGATIVE" && "✗ Negative Response"}
                      {contact.response === "NO_RESPONSE" && "No Response"}
                      {contact.response === "PENDING" && "Pending"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatDistanceToNow(new Date(contact.recordedAt))} ago
                    </p>
                  </div>
                  {contact.notes && (
                    <p className="text-sm text-[var(--text-muted)] mb-2">
                      {contact.notes}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500">
                    by {contact.recordedByName || contact.recordedBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Modal */}
      <LeadContactModal
        lead={lead}
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSave={handleSaveContact}
      />
    </div>
  )
}
