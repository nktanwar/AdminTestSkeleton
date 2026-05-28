import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getTheme, setTheme } from "../lib/theme"
import { useAuth } from "../context/AuthContext"
import { ChannelAPI } from "../lib/api"

export default function Topbar() {
  const [theme, setLocalTheme] = useState(getTheme())
  const {
    globalRole,
    logout,
    selectedChannelId,
    status,
  } = useAuth()

  const channelsQuery = useQuery({
    queryKey: ["channels", "topbar"],
    queryFn: ChannelAPI.list,
    enabled:
      status === "authenticated" && !!selectedChannelId,
  })

  const selectedChannelName =
    channelsQuery.data?.find(
      (channel) => channel.id === selectedChannelId
    )?.name ?? selectedChannelId

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    setLocalTheme(next)
  }

  return (
    <header className="h-14 border-b border-[var(--border)] px-6 flex items-center justify-between bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-muted)]">
          Allison Homes Internal Service
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {globalRole === "ADMIN"
            ? "Admin"
            : globalRole === "DEALER"
              ? "Dealer"
              : "Standard"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {selectedChannelId && (
          <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1 rounded-full">
            Channel: {selectedChannelName}
          </span>
        )}

        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
