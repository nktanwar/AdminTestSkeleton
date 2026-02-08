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
    <aside className="w-64 bg-zinc-900 border-r border-[var(--border)] p-4">
      <h1 className="text-xl font-bold mb-6">Alisan Admin</h1>

      <nav className="space-y-2">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-[var(--text-muted)] hover:bg-zinc-800"
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
