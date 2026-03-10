import { useAuth } from "../context/AuthContext"

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => {
      return (
        segment.charAt(0).toUpperCase() +
        segment.slice(1)
      )
    })
    .join(" ")
}

function getDisplayRole(
  globalRole: string | null,
  actorType: string | undefined
): string {
  if (globalRole) {
    return toTitleCase(globalRole)
  }

  if (actorType) {
    return toTitleCase(actorType)
  }

  return "User"
}

function getAvatarInitials(value: string): string {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return "U"
  }

  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export default function Profile() {
  const {
    actor,
    globalRole,
    selectedChannelId,
    selectedMembershipId,
    permissions,
  } = useAuth()
  const hasFullAccess =
    actor?.type === "ADMIN" ||
    permissions.includes("ADMIN_OVERRIDE")
  const permissionSummary = hasFullAccess
    ? "All"
    : String(permissions.length)
  const displayRole = getDisplayRole(
    globalRole,
    actor?.type
  )
  const profileTitle =
    actor?.type === "ADMIN" || globalRole === "ADMIN"
      ? "Administrator"
      : displayRole
  const profileSubtitle = actor?.sub
    ? `User ID: ${actor.sub}`
    : "Signed-in account"
  const avatarInitials = getAvatarInitials(profileTitle)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-lg font-bold">
            {avatarInitials}
          </div>
          <div>
            <div className="text-xl font-semibold">
              {profileTitle}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {profileSubtitle}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Account Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Role</div>
            <div className="text-sm font-semibold">
              {displayRole}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">User ID</div>
            <div className="text-sm font-mono">{actor?.sub || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Channel</div>
            <div className="text-sm">
              {selectedChannelId || actor?.channelId || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">
              Membership
            </div>
            <div className="text-sm font-mono">
              {selectedMembershipId ||
                actor?.membershipId ||
                "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Permissions</div>
            <div className="text-sm">{permissionSummary}</div>
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
