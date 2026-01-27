type PermissionPanelProps = {
  actor: {
    type: "ADMIN" | "CHANNEL_MEMBER"
    permissionCodes?: string[]
  }
}

export function PermissionPanel({ actor }: PermissionPanelProps) {
  if (actor.type === "ADMIN") {
    return (
      <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-4">
        <h2 className="font-semibold text-emerald-400">
          Admin Access
        </h2>
        <p className="text-sm text-zinc-300 mt-1">
          This user can perform all actions.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
      <h2 className="font-semibold mb-2">
        Your Permissions
      </h2>

      {actor.permissionCodes && actor.permissionCodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actor.permissionCodes.map((p) => (
            <span
              key={p}
              className="px-2 py-1 text-xs rounded bg-zinc-800"
            >
              {p}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          No permissions assigned
        </p>
      )}
    </div>
  )
}
