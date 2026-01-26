import { useEffect, useState } from "react"
import { PermissionAPI, type PermissionSet } from "../lib/api"

export default function PermissionSets() {
  const [allPermissions, setAllPermissions] = useState<string[]>([])
  const [sets, setSets] = useState<PermissionSet[]>([])
  const [activeSetId, setActiveSetId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      PermissionAPI.listPermissions(),
      PermissionAPI.listSets(),
    ]).then(([perms, sets]) => {
      setAllPermissions(perms)
      setSets(sets)
      if (sets.length > 0) setActiveSetId(sets[0].id)
    })
  }, [])

  const activeSet = sets.find((s) => s.id === activeSetId)

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

    const saved = await PermissionAPI.updateSet(
      activeSet.id,
      activeSet.permissions
    )

    setSets((prev) =>
      prev.map((s) => (s.id === saved.id ? saved : s))
    )
  }

  async function createNewSet() {
    const name = prompt("Permission set name?")
    if (!name) return

    const created = await PermissionAPI.createSet(name)
    setSets((prev) => [...prev, created])
    setActiveSetId(created.id)
  }

  if (!activeSet) return null

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Left */}
      <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Permission Sets</h2>
          <button
            onClick={createNewSet}
            className="text-xs text-emerald-400"
          >
            + New
          </button>
        </div>

        {sets.map((set) => (
          <button
            key={set.id}
            onClick={() => setActiveSetId(set.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              set.id === activeSetId
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            {set.name}
          </button>
        ))}
      </div>

      {/* Right */}
      <div className="col-span-9 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {activeSet.name} Permissions
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {allPermissions.map((permission) => (
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

        <div className="flex justify-end mt-6">
          <button
            onClick={saveChanges}
            className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
