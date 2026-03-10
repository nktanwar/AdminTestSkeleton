import { useEffect, useState } from "react"
import { getTheme, setTheme } from "../lib/theme"
import { useAuth } from "../context/AuthContext"
import { ChannelAPI } from "../lib/api"
import type { Channel } from "../types/channel"

export default function Topbar() {
  const [theme, setLocalTheme] = useState(getTheme())
  const {
    selectedChannelId,
    selectChannel,
    globalRole,
    logout,
    status,
  } = useAuth()
  const [channelsById, setChannelsById] = useState<
    Record<string, string>
  >({})
  const [channels, setChannels] = useState<Channel[]>([])

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    setLocalTheme(next)
  }

  useEffect(() => {
    if (status !== "authenticated") return
    ChannelAPI.list()
      .then((channels) => {
        const map: Record<string, string> = {}
        channels.forEach((c: Channel) => {
          map[c.id] = c.name
        })
        setChannels(channels)
        setChannelsById(map)
      })
      .catch(() => {
        // Fallback to channel ids in UI.
      })
  }, [status])

  useEffect(() => {
    if (
      status !== "authenticated" ||
      globalRole !== "ADMIN" ||
      selectedChannelId ||
      channels.length === 0
    ) {
      return
    }

    selectChannel(channels[0].id)
  }, [
    status,
    globalRole,
    selectedChannelId,
    channels,
    selectChannel,
  ])

  return (
    <header className="h-14 border-b border-[var(--border)] px-6 flex items-center justify-between bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-muted)]">
          Company Internal Service
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          CRM
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
            {channelsById[selectedChannelId] ??
              selectedChannelId}
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
