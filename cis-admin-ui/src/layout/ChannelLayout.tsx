import { Outlet, useParams, NavLink } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChannelAPI } from "../lib/api"

export default function ChannelLayout() {
  const { channelId } = useParams()

  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId,
  })

  if (channelQuery.error) {
    return (
      <div className="text-red-500">
        {channelQuery.error instanceof Error
          ? channelQuery.error.message
          : "Failed to load channel"}
      </div>
    )
  }

  if (!channelQuery.data) {
    return <div className="text-[var(--text-muted)]">Loading channel…</div>
  }
  const channel = channelQuery.data

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
