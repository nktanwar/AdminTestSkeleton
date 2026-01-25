import { useState } from "react"

interface Channel {
  id: string
  name: string
  code: string
  status: "ACTIVE" | "INACTIVE"
}

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: "1", name: "Alisan Smart Homes", code: "ALISAN", status: "ACTIVE" },
  ])

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")

  function createChannel() {
    if (!name || !code) return

    setChannels([
      ...channels,
      {
        id: Date.now().toString(),
        name,
        code: code.toUpperCase(),
        status: "ACTIVE",
      },
    ])

    setName("")
    setCode("")
    setShowCreate(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Channels</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
        >
          + Create Channel
        </button>
      </div>

      {/* Channel Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-300">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 font-mono">{c.code}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${c.status === "ACTIVE" ? "bg-emerald-700" : "bg-zinc-700"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button className="text-zinc-400 hover:text-white">View</button>
                  <button className="text-red-500 hover:text-red-400">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Channel Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create Channel</h2>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Channel Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 rounded"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Channel Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 rounded font-mono"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-zinc-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createChannel}
                className="px-4 py-2 bg-emerald-600 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
