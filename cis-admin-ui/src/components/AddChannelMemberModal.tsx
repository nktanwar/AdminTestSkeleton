import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { UserAPI, type User } from "../lib/api"

interface Props {
  onClose: () => void
  onConfirm: (users: User[]) => void
}

export default function AddChannelMemberModal({
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const usersQuery = useQuery({
    queryKey: ["users", "all"],
    queryFn: UserAPI.list,
  })

  const users = usersQuery.data ?? []

  function toggle(id: string) {
    setSelected((prev) => {
      const copy = new Set(prev)
      copy.has(id) ? copy.delete(id) : copy.add(id)
      return copy
    })
  }

  function confirm() {
    const chosen = users.filter((u) => selected.has(u.id))
    onConfirm(chosen)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Members</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white"
          >
            ✕
          </button>
        </div>

        {usersQuery.isLoading && (
          <div className="text-sm text-[var(--text-muted)]">
            Loading users…
          </div>
        )}
        {usersQuery.error && (
          <div className="text-sm text-red-400">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "Failed to load users"}
          </div>
        )}

        {!usersQuery.isLoading && !usersQuery.error && (
          <div className="max-h-72 overflow-y-auto border border-[var(--border)] rounded">
            {users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] hover:bg-zinc-800/40 cursor-pointer"
              >
                <input
                  type="checkbox"
                  disabled={u.status !== "ACTIVE"}
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    u.status === "ACTIVE"
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-zinc-700 text-[var(--text-muted)]"
                  }`}
                >
                  {u.status}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm bg-zinc-700 hover:bg-zinc-600"
          >
            Cancel
          </button>
          <button
            disabled={selected.size === 0}
            onClick={confirm}
            className="px-3 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            Add Selected
          </button>
        </div>
      </div>
    </div>
  )
}
