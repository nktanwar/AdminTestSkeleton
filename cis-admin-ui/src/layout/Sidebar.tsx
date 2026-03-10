import { NavLink } from "react-router-dom"
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

function getDisplayTitle(
  rawGlobalRole: string | null | undefined,
  membershipRole: string | null,
  actorType: string | undefined
): string {
  const preferred =
    rawGlobalRole ??
    membershipRole ??
    actorType ??
    "User"

  return toTitleCase(preferred)
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

export default function Sidebar() {
  const {
    actor,
    capabilities,
    memberships,
    selectedMembershipId,
  } = useAuth()
  const selectedMembership =
    memberships.find(
      (membership) =>
        membership.membershipId === selectedMembershipId
    ) ?? null
  const displayTitle = getDisplayTitle(
    actor?.globalRole,
    selectedMembership?.role ?? null,
    actor?.type
  )
  const avatarInitials = getAvatarInitials(displayTitle)
  const links = [
    { name: "Dashboard", to: "/" },
    { name: "Channels", to: "/channels" },
    ...(capabilities.canManagePermissions
      ? [{ name: "Permission Sets", to: "/permissions" }]
      : []),
  ]

  return (
    <aside className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border)] p-5 shadow-[var(--shadow-panel)] flex flex-col">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Cis Admin
        </div>
        <h1 className="text-xl font-bold mt-1">Alisan CRM</h1>
      </div>

      <nav className="space-y-2 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg transition ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--text-primary)] border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--accent-soft)]"
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `mt-4 flex items-center gap-3 p-3 rounded-lg border ${
            isActive
              ? "bg-[var(--accent-soft)] border-[var(--border)]"
              : "border-[var(--border)] hover:bg-[var(--accent-soft)]"
          }`
        }
      >
        <div className="h-9 w-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-semibold">
          {avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {displayTitle}
          </div>
          <div className="text-xs text-[var(--text-muted)] truncate">
            View Profile
          </div>
        </div>
      </NavLink>
    </aside>
  )
}
