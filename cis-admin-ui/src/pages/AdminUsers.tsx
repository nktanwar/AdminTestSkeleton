import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  AuthAPI,
  type CreateUserPayload,
  type CreatedUserResponse,
} from "../lib/api"

const INITIAL_FORM: CreateUserPayload = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "DEALER",
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong."
}

function validateForm(values: CreateUserPayload): string | null {
  if (!values.name.trim()) return "Name is required."
  if (!values.email.trim()) return "Email is required."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return "Enter a valid email address."
  }
  if (values.password.length < 8) {
    return "Password must be at least 8 characters."
  }
  return null
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function AdminUsers() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [createdUser, setCreatedUser] = useState<CreatedUserResponse | null>(null)
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null)

  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => AuthAPI.createUser(payload),
    onSuccess: (data) => {
      setCreatedUser(data)
      setForm(INITIAL_FORM)
      setValidationError(null)
      setCopiedField(null)
    },
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: CreateUserPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || undefined,
      password: form.password,
      role: form.role,
    }

    const error = validateForm(payload)
    if (error) {
      setValidationError(error)
      return
    }

    setValidationError(null)
    await createUserMutation.mutateAsync(payload)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-card)]">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Admin User Creation
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Create staff and dealer accounts
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            This is an internal-only flow. Admins issue a temporary password,
            then share credentials securely with the new user.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Name</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                placeholder="John Dealer"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Role</span>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as CreateUserPayload["role"],
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              >
                <option value="DEALER">DEALER</option>
                <option value="STANDARD">STANDARD</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                placeholder="john@dealer.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Phone</span>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                placeholder="+919999999999"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Temporary Password</span>
            <input
              type="text"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
              placeholder="Minimum 8 characters"
            />
          </label>

          {(validationError || createUserMutation.error) && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {validationError ?? toErrorMessage(createUserMutation.error)}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="rounded-2xl bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createUserMutation.isPending ? "Creating user..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(INITIAL_FORM)
                setValidationError(null)
                createUserMutation.reset()
              }}
              className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--accent-soft)]"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-xl font-semibold">Credential Handoff</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          After creation, copy the generated credentials and send them through a
          secure internal channel.
        </p>

        {createdUser ? (
          <div className="mt-6 space-y-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                User Created Successfully
              </p>
              <p className="mt-2 text-lg font-semibold">{createdUser.name}</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Email
              </div>
              <div className="mt-2 break-all text-sm">{createdUser.email}</div>
              <button
                type="button"
                onClick={async () => {
                  await copyText(createdUser.email)
                  setCopiedField("email")
                }}
                className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--accent-soft)]"
              >
                {copiedField === "email" ? "Copied" : "Copy Email"}
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Temporary Password
              </div>
              <div className="mt-2 break-all text-sm">{createdUser.password}</div>
              <button
                type="button"
                onClick={async () => {
                  await copyText(createdUser.password)
                  setCopiedField("password")
                }}
                className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--accent-soft)]"
              >
                {copiedField === "password" ? "Copied" : "Copy Password"}
              </button>
            </div>

            {createdUser.phone && (
              <div className="text-sm text-[var(--text-muted)]">
                Phone: {createdUser.phone}
              </div>
            )}

            <p className="text-sm text-[var(--text-muted)]">
              Remind the user to change this temporary password after first sign-in.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] p-5 text-sm text-[var(--text-muted)]">
            No user has been created in this session yet.
          </div>
        )}
      </aside>
    </div>
  )
}
