import { useState } from "react"
import { getTheme, setTheme } from "../lib/theme"

export default function Topbar() {
  const [theme, setLocalTheme] = useState(getTheme())

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    setLocalTheme(next)
  }

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

        <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1 rounded-full">
          OWNER VIEW
        </span>
      </div>
    </header>
  )
}
