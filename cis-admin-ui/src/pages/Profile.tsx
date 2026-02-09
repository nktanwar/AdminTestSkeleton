import { getToken } from "../lib/auth"

function decode(token: string) {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export default function Profile() {
  const token = getToken()
  const actor = token ? decode(token) : null

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-lg font-bold">
            AU
          </div>
          <div>
            <div className="text-xl font-semibold">Admin User</div>
            <div className="text-sm text-[var(--text-muted)]">admin@company.com</div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Account Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Role</div>
            <div className="text-sm font-semibold">{actor?.type || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">User ID</div>
            <div className="text-sm font-mono">{actor?.sub || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Channel</div>
            <div className="text-sm">{actor?.channelId || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Permissions</div>
            <div className="text-sm">
              {actor?.permissionCodes?.length || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Preferences</h2>
        <div className="text-sm text-[var(--text-muted)]">
          Profile preferences will be configurable in a later phase.
        </div>
      </div>
    </div>
  )
}
