import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  UserAPI,
  type AddChannelMemberPayload,
  type PermissionSet,
  type User,
} from "../lib/api"

type Mode = "existing" | "external"

interface Props {
  onClose: () => void
  permissionSets: PermissionSet[]
  onSubmit: (
    payload: AddChannelMemberPayload
  ) => Promise<void>
  submitting?: boolean
  error?: string | null
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

export default function AddChannelMemberModal({
  onClose,
  permissionSets,
  onSubmit,
  submitting = false,
  error = null,
}: Props) {
  const [mode, setMode] = useState<Mode>("existing")
  const [permissionSetId, setPermissionSetId] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [externalName, setExternalName] = useState("")
  const [externalEmail, setExternalEmail] = useState("")
  const [externalPhone, setExternalPhone] = useState("")
  const [validationError, setValidationError] = useState<
    string | null
  >(null)

  const usersQuery = useQuery({
    queryKey: ["users", "all"],
    queryFn: UserAPI.list,
    enabled: mode === "existing",
  })

  const activeUsers = useMemo(
    () =>
      ((usersQuery.data ?? []) as User[]).filter(
        (u) => u.status === "ACTIVE"
      ),
    [usersQuery.data]
  )

  function buildPayload():
    | AddChannelMemberPayload
    | null {
    const normalizedPermissionSetId = permissionSetId.trim()
    if (!normalizedPermissionSetId) {
      setValidationError("Permission Set is required.")
      return null
    }

    if (mode === "existing") {
      if (!selectedUserId) {
        setValidationError(
          "Select an existing user to add."
        )
        return null
      }

      return {
        userId: selectedUserId,
        permissionSetId: normalizedPermissionSetId,
        externalName: null,
        externalEmail: null,
        externalPhone: null,
      }
    }

    const normalizedExternalName = externalName.trim()
    const normalizedExternalEmail = externalEmail.trim()
    const normalizedExternalPhone = externalPhone.trim()

    if (!normalizedExternalName) {
      setValidationError("External name is required.")
      return null
    }
    if (!normalizedExternalEmail) {
      setValidationError("External email is required.")
      return null
    }

    return {
      userId: null,
      permissionSetId: normalizedPermissionSetId,
      externalName: normalizedExternalName,
      externalEmail: normalizedExternalEmail,
      externalPhone:
        normalizedExternalPhone.length > 0
          ? normalizedExternalPhone
          : null,
    }
  }

  async function submit() {
    setValidationError(null)
    const payload = buildPayload()
    if (!payload) return

    try {
      await onSubmit(payload)
      onClose()
    } catch (e) {
      setValidationError(toErrorMessage(e))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Member</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white"
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode("existing")
              setValidationError(null)
            }}
            className={`px-3 py-1.5 rounded text-sm ${
              mode === "existing"
                ? "bg-emerald-700 text-white"
                : "bg-zinc-700 text-zinc-300"
            }`}
            disabled={submitting}
          >
            Existing User
          </button>
          <button
            onClick={() => {
              setMode("external")
              setValidationError(null)
            }}
            className={`px-3 py-1.5 rounded text-sm ${
              mode === "external"
                ? "bg-emerald-700 text-white"
                : "bg-zinc-700 text-zinc-300"
            }`}
            disabled={submitting}
          >
            External Member
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">
            Permission Set
          </label>
          <select
            value={permissionSetId}
            onChange={(e) =>
              setPermissionSetId(e.target.value)
            }
            className="w-full bg-zinc-800 rounded px-3 py-2"
            disabled={submitting}
          >
            <option value="">Select permission set</option>
            {permissionSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </div>

        {mode === "existing" && (
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-muted)]">
              Select Existing User
            </label>

            {usersQuery.isLoading && (
              <div className="text-sm text-[var(--text-muted)]">
                Loading users...
              </div>
            )}

            {usersQuery.error && (
              <div className="text-sm text-red-400">
                {toErrorMessage(usersQuery.error)}
              </div>
            )}

            {!usersQuery.isLoading &&
              !usersQuery.error && (
                <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded">
                  {activeUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] hover:bg-zinc-800/40 cursor-pointer"
                    >
                      <input
                        type="radio"
                        checked={
                          selectedUserId === user.id
                        }
                        onChange={() =>
                          setSelectedUserId(user.id)
                        }
                        name="selected-user"
                        disabled={submitting}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {user.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {user.email}
                        </div>
                      </div>
                    </label>
                  ))}
                  {activeUsers.length === 0 && (
                    <div className="px-4 py-3 text-sm text-[var(--text-muted)]">
                      No active users found.
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {mode === "external" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="External Name"
              value={externalName}
              onChange={setExternalName}
              disabled={submitting}
            />
            <Field
              label="External Email"
              value={externalEmail}
              onChange={setExternalEmail}
              disabled={submitting}
            />
            <Field
              label="External Phone"
              value={externalPhone}
              onChange={setExternalPhone}
              disabled={submitting}
            />
          </div>
        )}

        {(validationError || error) && (
          <div className="text-sm text-red-400">
            {validationError ?? error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm bg-zinc-700 hover:bg-zinc-600"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void submit()
            }}
            className="px-3 py-1.5 rounded text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-[var(--text-muted)]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 rounded px-3 py-2"
        disabled={disabled}
      />
    </div>
  )
}
