import { useState } from "react"

interface Props {
  onClose: () => void
  onCreate: (input: { name: string; code: string }) => void
}

export default function CreateChannelModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")

  function handleSubmit() {
    if (!name || !code) return

    onCreate({
      name,
      code,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create Channel</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name"
          className="w-full bg-zinc-800 rounded px-3 py-2"
        />

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          className="w-full bg-zinc-800 rounded px-3 py-2 font-mono"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
