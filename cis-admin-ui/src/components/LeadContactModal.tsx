import { useState } from "react"
import type { Lead } from "../types/lead"
import { LeadStage } from "../types/lead"

interface LeadContactModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    method: "CALL" | "EMAIL" | "MEETING" | "OTHER"
    response: "POSITIVE" | "NEGATIVE" | "NO_RESPONSE" | "PENDING"
    notes?: string
  }) => Promise<void>
}

export function LeadContactModal({
  lead,
  isOpen,
  onClose,
  onSave,
}: LeadContactModalProps) {
  const [method, setMethod] = useState<"CALL" | "EMAIL" | "MEETING" | "OTHER">(
    "CALL"
  )
  const [response, setResponse] = useState<
    "POSITIVE" | "NEGATIVE" | "NO_RESPONSE" | "PENDING"
  >("PENDING")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setError(null)
      setIsSaving(true)
      await onSave({ method, response, notes })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-semibold mb-4">
          Log Contact: {lead.name}
        </h3>

        <div className="space-y-4">
          {/* Contact Method */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Contact Method
            </label>
            <select
              value={method}
              onChange={(e) =>
                setMethod(
                  e.target.value as "CALL" | "EMAIL" | "MEETING" | "OTHER"
                )
              }
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm"
            >
              <option value="CALL">Call</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">Meeting</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Response */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Response
            </label>
            <select
              value={response}
              onChange={(e) =>
                setResponse(
                  e.target.value as
                    | "POSITIVE"
                    | "NEGATIVE"
                    | "NO_RESPONSE"
                    | "PENDING"
                )
              }
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEGATIVE">Negative</option>
              <option value="NO_RESPONSE">No Response</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add contact details and observations..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm h-24 resize-none"
            />
          </div>

          {/* Auto-mark as Contacted */}
          {lead.stage === LeadStage.NEW && (
            <p className="text-xs text-emerald-400 bg-emerald-600/10 p-2 rounded">
              ✓ Lead will be marked as CONTACTED
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-600/10 p-2 rounded">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Contact"}
          </button>
        </div>
      </div>
    </div>
  )
}
