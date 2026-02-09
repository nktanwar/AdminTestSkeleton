import { NavLink } from "react-router-dom"

const links = [
  { name: "Dashboard", to: "/" },
  { name: "Channels", to: "/channels" },
  // { name: "Members", to: "/members" },
  { name: "Permission Sets", to: "/permissions" },
  { name: "Demo Switch", to: "/demo" },
]

export default function Sidebar() {
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
          AU
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">Admin User</div>
          <div className="text-xs text-[var(--text-muted)] truncate">
            View Profile
          </div>
        </div>
      </NavLink>
    </aside>
  )
}
