import { useState } from "react"
import { AuthAPI } from "../lib/api"
import { setToken } from "../lib/auth"

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)

    try {
      const res = await AuthAPI.login(email)
      setToken(res.token)
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Admin Login</h1>

        <input
          placeholder="admin@alisan.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 rounded"
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-2 bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  )
}
