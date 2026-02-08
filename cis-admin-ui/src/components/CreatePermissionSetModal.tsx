import { useState } from "react"

interface Props {
  onClose: () => void
  onCreate: (name: string) => void
  creating?: boolean
  error?: string | null
}

export default function CreatePermissionSetModal({
  onClose,
  onCreate,
  creating = false,
  error = null,
}: Props) {
  const [name, setName] = useState("")
  const [touched, setTouched] = useState(false)

  const trimmed = name.trim()
  const valid = trimmed.length >= 2

  function submit() {
    setTouched(true)
    if (!valid || creating) return
    onCreate(trimmed)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Create Permission Set</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[var(--text-muted)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Billing Admin"
            className="w-full bg-zinc-800 rounded px-3 py-2"
          />
          {!valid && touched && (
            <div className="text-xs text-red-400">Name must be at least 2 characters.</div>
          )}
          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--text-muted)]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || creating}
            className="px-4 py-2 bg-emerald-600 rounded disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}
