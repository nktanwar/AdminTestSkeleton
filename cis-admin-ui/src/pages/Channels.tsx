import { useEffect, useState } from "react"
import type { Channel } from "../types/channel"
import { ChannelAPI } from "../lib/api"
import CreateChannelModal from "../components/CreateChannelModal"
import { useNavigate } from "react-router-dom"

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()   


  const [showCreate, setShowCreate] = useState(false)
//   const [name, setName] = useState("")
//   const [code, setCode] = useState("")


  // LOAD CHANNELS FROM BACKEND
  useEffect(() => {
    ChannelAPI.list()
      .then(setChannels)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function createChannel(input: { name: string; code: string }) {
  try {
    const created = await ChannelAPI.create({
      name: input.name,
      code: input.code,
    })

    setChannels((prev) => [...prev, created])
    setShowCreate(false)
  } catch (e: any) {
    alert(e.message)
  }
}

async function deactivateChannel(id: string) {
  if (!confirm("Freeze this channel?")) return

  try {
    const updated = await ChannelAPI.deactivate(id)

    setChannels((prev) =>
      prev.map((c) => (c.id === id ? updated : c))
    )
  } catch (e: any) {
    alert(e.message)
  }
}




  if (loading) return <div>Loading channels…</div>
  if (error) return <div className="text-red-500">{error}</div>

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
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      c.status === "ACTIVE"
                        ? "bg-emerald-700"
                        : "bg-zinc-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                <button
  onClick={() => navigate(`/channels/${c.id}`)}
  className="text-zinc-400 hover:text-white"
>
  View
</button>

                  {c.status === "ACTIVE" ? (
  <button
    onClick={() => deactivateChannel(c.id)}
    className="text-red-500 hover:text-red-400"
  >
    Freeze
  </button>
) : (
  <span className="text-zinc-500 text-sm">Frozen</span>
)}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Channel Modal */}
{showCreate && (
  <CreateChannelModal
    onClose={() => setShowCreate(false)}
    onCreate={createChannel}
  />
)}


  
    </div>
  )
}
