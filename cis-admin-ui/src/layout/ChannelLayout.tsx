import { Outlet, useParams, NavLink } from "react-router-dom"
import { useEffect, useState } from "react"
import { ChannelAPI } from "../lib/api"
import type { Channel } from "../types/channel"

export default function ChannelLayout() {
  const { channelId } = useParams()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!channelId) return

    ChannelAPI.get(channelId)
      .then(setChannel)
      .catch((e) => setError(e.message))
  }, [channelId])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (!channel) {
    return <div className="text-[var(--text-muted)]">Loading channel…</div>
  }

  return (
    <div className="space-y-6">
      {/* Channel Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{channel.name}</h1>
          <p className="text-sm text-[var(--text-muted)] font-mono">
            {channel.code}
          </p>
        </div>

        <button className="px-3 py-1.5 rounded border border-red-600 text-red-500 hover:bg-red-600/10 text-sm">
          Freeze Channel
        </button>
      </div>

      {/* Channel Navigation */}
      <div className="flex gap-4 border-b border-[var(--border)] pb-2">
        <ChannelTab to="">Dashboard</ChannelTab>
        <ChannelTab to="members">Members</ChannelTab>
        <ChannelTab to="permissions">Permission Sets</ChannelTab>
      </div>

      {/* Channel Page Content */}
      <Outlet />
    </div>
  )
}

function ChannelTab({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-1 rounded text-sm ${
          isActive
            ? "bg-zinc-800 text-white"
            : "text-[var(--text-muted)] hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  )
}
