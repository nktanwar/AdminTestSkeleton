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
  const { actor, isAdmin } = useAuth()
  const displayTitle = getDisplayTitle(
    actor?.globalRole,
    null,
    actor?.type
  )
  const avatarInitials = getAvatarInitials(displayTitle)
  const links = isAdmin
    ? [
        { name: "Dashboard", to: "/admin/dashboard" },
        { name: "Channel Dashboard", to: "/dashboard" },
        { name: "Channels", to: "/channels" },
        { name: "Permission Sets", to: "/permissions" },
        { name: "Users", to: "/admin/users" },
        {
          name: "Knowledge Centers",
          to: "/admin/knowledge-centers",
        },
        
      ]
    : [
        { name: "Dashboard", to: "/dealer/dashboard" },
        { name: "Channels", to: "/dealer/channels" },
        { name: "Orders", to: "/dealer/orders" },
        { name: "Leads", to: "/dealer/leads" },
        {
          name: "Knowledge Centers",
          to: "/dealer/knowledge-centers",
        },
        
      ]

  return (
    <aside className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border)] p-5 shadow-[var(--shadow-panel)] flex flex-col">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Allison Homes
        </div>
        <h1 className="text-xl font-bold mt-1">Internal Console</h1>
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
