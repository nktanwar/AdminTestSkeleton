import { useEffect, useMemo, useState } from "react"
import { PermissionAPI, type PermissionSet } from "../lib/api"
import CreatePermissionSetModal from "../components/CreatePermissionSetModal"

export default function PermissionSets() {
  const [allPermissions, setAllPermissions] = useState<string[]>([])
  const [sets, setSets] = useState<PermissionSet[]>([])
  const [savedSets, setSavedSets] = useState<PermissionSet[]>([])
  const [activeSetId, setActiveSetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [permissionFilter, setPermissionFilter] = useState("")

  useEffect(() => {
    Promise.all([
      PermissionAPI.listPermissions(),
      PermissionAPI.listSets(),
    ])
      .then(([perms, list]) => {
        setAllPermissions(perms)
        setSets(list)
        setSavedSets(list)
        if (list.length > 0) setActiveSetId(list[0].id)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activeSet = sets.find((s) => s.id === activeSetId)
  const activeSaved = savedSets.find((s) => s.id === activeSetId)

  const filteredPermissions = useMemo(() => {
    const q = permissionFilter.trim().toLowerCase()
    if (!q) return allPermissions
    return allPermissions.filter((p) => p.toLowerCase().includes(q))
  }, [allPermissions, permissionFilter])

  function normalize(perms: string[]) {
    return [...perms].sort()
  }

  const isDirty = useMemo(() => {
    if (!activeSet || !activeSaved) return false
    const a = normalize(activeSet.permissions)
    const b = normalize(activeSaved.permissions)
    if (a.length !== b.length) return true
    return a.some((p, i) => p !== b[i])
  }, [activeSet, activeSaved])

  function togglePermission(permission: string) {
    if (!activeSet) return

    const updated = activeSet.permissions.includes(permission)
      ? activeSet.permissions.filter((p) => p !== permission)
      : [...activeSet.permissions, permission]

    setSets((prev) =>
      prev.map((s) =>
        s.id === activeSet.id ? { ...s, permissions: updated } : s
      )
    )
  }

  async function saveChanges() {
    if (!activeSet) return

    setSaving(true)
    try {
      const saved = await PermissionAPI.updateSet(
        activeSet.id,
        activeSet.permissions
      )

      setSets((prev) =>
        prev.map((s) => (s.id === saved.id ? saved : s))
      )
      setSavedSets((prev) =>
        prev.map((s) => (s.id === saved.id ? saved : s))
      )
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function createNewSet(name: string) {
    setCreating(true)
    setCreateError(null)
    try {
      const created = await PermissionAPI.createSet(name)
      setSets((prev) => [...prev, created])
      setSavedSets((prev) => [...prev, created])
      setActiveSetId(created.id)
      setShowCreate(false)
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
    }
  }

  function switchSet(id: string) {
    if (isDirty) {
      const ok = confirm(
        "You have unsaved changes. Discard them and switch sets?"
      )
      if (!ok) return
    }
    setActiveSetId(id)
  }

  if (loading) return <div>Loading permission sets…</div>
  if (error) return <div className="text-red-500">{error}</div>

  if (!activeSet) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 space-y-4">
        <div className="text-lg font-semibold">Permission Sets</div>
        <div className="text-sm text-[var(--text-muted)]">
          No permission sets yet.
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
        >
          + Create First Set
        </button>

        {showCreate && (
          <CreatePermissionSetModal
            onClose={() => setShowCreate(false)}
            onCreate={createNewSet}
            creating={creating}
            error={createError}
          />
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Left */}
      <div className="col-span-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Permission Sets</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-emerald-400"
          >
            + New
          </button>
        </div>

        {sets.map((set) => (
          <button
            key={set.id}
            onClick={() => switchSet(set.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              set.id === activeSetId
                ? "bg-zinc-800 text-white"
                : "text-[var(--text-muted)] hover:bg-zinc-800/40"
            }`}
          >
            {set.name}
          </button>
        ))}
      </div>

      {/* Right */}
      <div className="col-span-9 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {activeSet.name} Permissions
          </h2>
          {isDirty && (
            <span className="text-xs px-2 py-1 rounded bg-amber-900/60 text-amber-200">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="mb-4">
          <input
            value={permissionFilter}
            onChange={(e) => setPermissionFilter(e.target.value)}
            placeholder="Search permissions…"
            className="w-full bg-zinc-800 rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredPermissions.map((permission) => (
            <label
              key={permission}
              className="flex items-center gap-3 bg-zinc-800/40 hover:bg-zinc-800 px-4 py-3 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={activeSet.permissions.includes(permission)}
                onChange={() => togglePermission(permission)}
                className="accent-emerald-500"
              />
              <span className="text-sm">{permission}</span>
            </label>
          ))}
        </div>

        {filteredPermissions.length === 0 && (
          <div className="text-sm text-[var(--text-muted)]">
            No permissions match your search.
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={saveChanges}
            disabled={!isDirty || saving}
            className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreatePermissionSetModal
          onClose={() => setShowCreate(false)}
          onCreate={createNewSet}
          creating={creating}
          error={createError}
        />
      )}
    </div>
  )
}
