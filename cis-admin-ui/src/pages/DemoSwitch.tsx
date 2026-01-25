import { useState } from "react"

type Role = "OWNER" | "ADMIN" | "STAFF"

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: [
    "DELETE_CHANNEL",
    "FUNNEL_CREATE",
    "FUNNEL_TRANSFER",
    "WORK_ASSIGN",
    "ADMIN_OVERRIDE",
  ],
  ADMIN: [
    "FUNNEL_CREATE",
    "FUNNEL_TRANSFER",
    "WORK_ASSIGN",
  ],
  STAFF: [
    "WORK_ASSIGN",
  ],
}

export default function DemoSwitch() {
  const [role, setRole] = useState<Role>("OWNER")
  const permissions = ROLE_PERMISSIONS[role]

  function has(permission: string) {
    return permissions.includes(permission)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Demo Switch</h1>
        <span className="px-3 py-1 text-sm rounded bg-emerald-600">
          {role} VIEW
        </span>
      </div>

      {/* Role Switcher */}
      <div className="flex gap-3">
        {(["OWNER", "ADMIN", "STAFF"] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-4 py-2 rounded font-medium ${
              role === r
                ? "bg-emerald-600"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Active Permissions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h2 className="font-semibold mb-2">Active Permissions</h2>
        <div className="flex flex-wrap gap-2">
          {permissions.map((p) => (
            <span
              key={p}
              className="px-3 py-1 text-xs rounded bg-zinc-800"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Proof Area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg">Actions</h2>

        {/* Delete Channel */}
        <ActionRow
          label="Delete Channel"
          visible={has("DELETE_CHANNEL")}
          danger
        />

        {/* Create Funnel */}
        <ActionRow
          label="Create Funnel"
          visible={has("FUNNEL_CREATE")}
        />

        {/* Transfer Funnel */}
        <ActionRow
          label="Transfer Funnel"
          visible={has("FUNNEL_TRANSFER")}
        />

        {/* Assign Work */}
        <ActionRow
          label="Assign Work"
          visible={has("WORK_ASSIGN")}
        />
      </div>
    </div>
  )
}

function ActionRow({
  label,
  visible,
  danger = false,
}: {
  label: string
  visible: boolean
  danger?: boolean
}) {
  if (!visible) {
    return (
      <div className="flex justify-between items-center opacity-40">
        <span>{label}</span>
        <span className="text-xs text-zinc-500">
          Not permitted
        </span>
      </div>
    )
  }

  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <button
        className={`px-4 py-1.5 rounded text-sm ${
          danger
            ? "bg-red-600 hover:bg-red-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        Execute
      </button>
    </div>
  )
}
