import { useState } from "react"

interface Props {
  onClose: () => void
  onAdd: (member: any) => void
}

export default function AddMemberModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [level, setLevel] = useState("STAFF")
  const [permissionSet, setPermissionSet] = useState("BASIC")

  function handleSubmit() {
    onAdd({
      id: crypto.randomUUID(),
      name,
      email,
      level,
      permissionSet,
      status: "ACTIVE",
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Add Member</h2>

        <Input label="Name" value={name} onChange={setName} />
        <Input label="Email" value={email} onChange={setEmail} />

        <Select
          label="Level"
          value={level}
          onChange={setLevel}
          options={["OWNER", "ADMIN", "STAFF"]}
        />

        <Select
          label="Permission Set"
          value={permissionSet}
          onChange={setPermissionSet}
          options={["ADMIN", "BASIC"]}
        />

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded"
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-[var(--text-muted)]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
      />
    </div>
  )
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-[var(--text-muted)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
      >
        {options.map((opt: string) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
