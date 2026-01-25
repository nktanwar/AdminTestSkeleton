import { useState } from "react"

interface Props {
  onClose: () => void
  onCreate: (channel: any) => void
}

export default function CreateChannelModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")

  function handleSubmit() {
    onCreate({
      id: crypto.randomUUID(),
      name,
      code,
      status: "ACTIVE",
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create Channel</h2>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Channel Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Channel Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
