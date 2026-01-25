import { useState } from "react"

const ALL_PERMISSIONS = [
  "FUNNEL_CREATE",
  "FUNNEL_TRANSFER",
  "WORK_ASSIGN",
  "ADMIN_OVERRIDE",
]

interface PermissionSet {
  id: string
  name: string
  permissions: string[]
}

const mockSets: PermissionSet[] = [
  {
    id: "1",
    name: "ADMIN",
    permissions: ALL_PERMISSIONS,
  },
  {
    id: "2",
    name: "BASIC",
    permissions: ["FUNNEL_CREATE"],
  },
]

export default function PermissionSets() {
  const [sets, setSets] = useState<PermissionSet[]>(mockSets)
  const [activeSetId, setActiveSetId] = useState("1")

  const activeSet = sets.find((s) => s.id === activeSetId)!

  function togglePermission(permission: string) {
    setSets((prev) =>
      prev.map((set) =>
        set.id === activeSetId
          ? {
              ...set,
              permissions: set.permissions.includes(permission)
                ? set.permissions.filter((p) => p !== permission)
                : [...set.permissions, permission],
            }
          : set
      )
    )
  }

  function createNewSet() {
    const newSet: PermissionSet = {
      id: crypto.randomUUID(),
      name: "NEW_SET",
      permissions: [],
    }
    setSets([...sets, newSet])
    setActiveSetId(newSet.id)
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Left: Sets List */}
      <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Permission Sets</h2>
          <button
            onClick={createNewSet}
            className="text-xs text-emerald-400 hover:text-emerald-300"
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

      {/* Right: Permission Matrix */}
      <div className="col-span-9 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {activeSet.name} Permissions
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {ALL_PERMISSIONS.map((permission) => (
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
              <div>
                <p className="font-medium text-sm">{permission}</p>
                <p className="text-xs text-zinc-400">
                  Allows {permission.replace("_", " ").toLowerCase()}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
