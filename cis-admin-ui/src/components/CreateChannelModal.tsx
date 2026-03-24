import { useState } from "react"

interface Props {
  onClose: () => void
  onCreate: (input: {
    name: string
    code: string
  }) => Promise<void>
  isSubmitting?: boolean
  errorMessage?: string | null
}

function normalizeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24)
}

export default function CreateChannelModal({
  onClose,
  onCreate,
  isSubmitting = false,
  errorMessage = null,
}: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [touched, setTouched] = useState(false)

  const trimmedName = name.trim()
  const normalizedCode = normalizeCode(code)
  const canSubmit =
    trimmedName.length > 0 && normalizedCode.length > 0 && !isSubmitting

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)

    if (!canSubmit) return

    await onCreate({
      name: trimmedName,
      code: normalizedCode,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Create Channel</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Add a new channel workspace with a clear name and stable code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="North Region Sales"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            {touched && !trimmedName && (
              <p className="text-xs text-red-300">
                Channel name is required.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Channel code</label>
            <input
              value={code}
              onChange={(event) =>
                setCode(normalizeCode(event.target.value))
              }
              onBlur={() => setTouched(true)}
              placeholder="NORTH_SALES"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 font-mono text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <p className="text-xs text-[var(--text-muted)]">
              Use uppercase letters, numbers, underscores, or hyphens.
            </p>
            {touched && !normalizedCode && (
              <p className="text-xs text-red-300">
                Channel code is required.
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
