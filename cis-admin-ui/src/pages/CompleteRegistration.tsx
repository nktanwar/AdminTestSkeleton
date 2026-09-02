import { useMemo, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  clearPendingRegistrationEmail,
  getPendingRegistrationEmail,
} from "../lib/auth"
import {
  getCurrentFirebaseEmail,
} from "../lib/firebaseSession"
import { toUserFacingErrorMessage } from "../lib/errors"

export default function CompleteRegistration() {
  const [username, setUsername] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { status, isAdmin, completeRegistration } = useAuth()

  const email = useMemo(
    () =>
      getCurrentFirebaseEmail() ??
      getPendingRegistrationEmail() ??
      "",
    []
  )

  if (status === "authenticated") {
    return (
      <Navigate
        to={isAdmin ? "/admin/dashboard" : "/dealer/dashboard"}
        replace
      />
    )
  }

  async function submit() {
    if (!username.trim()) {
      setError("Username is required")
      return
    }

    if (!phoneNumber.trim()) {
      setError("Phone number is required")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const role = await completeRegistration({
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
      })
      clearPendingRegistrationEmail()
      navigate(
        role === "ADMIN"
          ? "/admin/dashboard"
          : "/dealer/dashboard",
        { replace: true }
      )
    } catch (error: unknown) {
      setError(toUserFacingErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)] p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Company Internal Service
              </div>
              <h1 className="text-3xl leading-tight">
                Complete your registration
              </h1>
              <p className="text-sm text-[var(--text-muted)] max-w-sm">
                Your email is already verified. Finish setting up your
                application profile to continue.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] p-8">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl">Account Details</h2>
              <p className="text-sm text-[var(--text-muted)]">
                These details complete your internal account.
              </p>
            </div>

            <label className="block text-sm font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)] text-[var(--text-muted)]"
            />

            <label className="block text-sm font-semibold mt-4 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />

            <label className="block text-sm font-semibold mt-4 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />

            <label className="block text-sm font-semibold mt-4 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />

            {error && (
              <p className="text-sm text-red-500 mt-3">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="mt-5 w-full py-2.5 rounded-lg bg-[var(--accent-strong)] hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Completing registration..." : "Complete Registration"}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
