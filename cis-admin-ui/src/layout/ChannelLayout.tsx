import { type ReactNode, useEffect } from "react"
import {
  NavLink,
  Outlet,
  useParams,
} from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChannelAPI } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { canViewFunnels } from "../lib/access"
import type { Channel } from "../types/channel"

function statusTone(status: Channel["status"]): string {
  if (status === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-300"
}

export default function ChannelLayout() {
  const { channelId } = useParams<{ channelId: string }>()
  const {
    capabilities,
    selectedChannelId,
    selectChannel,
    isAdmin,
    channelMe,
    permissions,
  } = useAuth()
  const isChannelAdmin =
    isAdmin || channelMe?.isAdmin === true
  const showFunnelsTab = canViewFunnels(
    isChannelAdmin,
    permissions
  )

  useEffect(() => {
    if (!channelId) return
    if (selectedChannelId === channelId) return
    selectChannel(channelId)
  }, [channelId, selectedChannelId, selectChannel])

  const channelQuery = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: !!channelId,
  })

  if (channelQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {channelQuery.error instanceof Error
          ? channelQuery.error.message
          : "Failed to load channel"}
      </div>
    )
  }

  if (!channelQuery.data) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading channel...
      </div>
    )
  }

  const channel = channelQuery.data

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,20,27,0.96))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.18em]">
              <span className={[
                "rounded-full border px-3 py-1 uppercase",
                statusTone(channel.status),
              ].join(" ")}>
                {channel.status}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[var(--text-soft)]">
                {channel.code}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[var(--text-soft)]">
                {isChannelAdmin ? "Channel Admin" : "Channel Member"}
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {channel.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--text-soft)]">
                {isChannelAdmin
                  ? "Operational workspace for this channel, including navigation to funnels, members, and settings."
                  : "Your scoped channel workspace with only the areas and data available to your membership."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {showFunnelsTab && (
              <HeaderAction to="funnels">Open Funnels</HeaderAction>
            )}
            {capabilities.canUpdateChannel && (
              <HeaderAction to="settings">
                Channel Settings
              </HeaderAction>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-2">
          <ChannelTab to="">Overview</ChannelTab>
          {showFunnelsTab && (
            <ChannelTab to="funnels" end={false}>
              Funnels
            </ChannelTab>
          )}
          {!isChannelAdmin && (
            <ChannelTab to="my-leads">My Leads</ChannelTab>
          )}
          {capabilities.canViewMembers && (
            <ChannelTab to="members">Members</ChannelTab>
          )}
          {capabilities.canUpdateChannel && (
            <ChannelTab to="settings">Settings</ChannelTab>
          )}
        </div>
      </div>

      <Outlet />
    </div>
  )
}

function HeaderAction({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
    >
      {children}
    </NavLink>
  )
}

function ChannelTab({
  to,
  children,
  end = true,
}: {
  to: string
  children: ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "rounded-xl px-4 py-2 text-sm font-medium transition",
          isActive
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  )
}
