import { useState } from "react"
import { getTheme, setTheme } from "../lib/theme"
import { useAuth } from "../context/AuthContext"

export default function Login() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setLocalTheme] = useState(getTheme())
  const { login } = useAuth()

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    setLocalTheme(next)
  }

  async function submit() {
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await login(email.trim())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-end mb-6">
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--accent-soft)]"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)] p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Company Internal Service
              </div>
              <h1 className="text-3xl leading-tight">Alisan CRM Admin</h1>
              <p className="text-sm text-[var(--text-muted)] max-w-sm">
                Manage channels, members, permissions, and funnels from one
                secure admin workspace.
              </p>
            </div>
            <div className="mt-8 flex gap-2 flex-wrap">
              <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1 rounded-full">
                OWNER VIEW
              </span>
              <span className="text-xs bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1 rounded-full">
                CRM
              </span>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] p-8">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl">Sign In</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Use your admin email to access the dashboard.
              </p>
            </div>

            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              placeholder="admin@alisan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <button
              onClick={submit}
              disabled={loading}
              className="mt-5 w-full py-2.5 rounded-lg bg-[var(--accent-strong)] hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Continue to Dashboard"}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
