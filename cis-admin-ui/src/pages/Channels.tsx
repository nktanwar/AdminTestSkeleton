import { useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import type { Channel } from "../types/channel"
import { ApiError, ChannelAPI } from "../lib/api"
import CreateChannelModal from "../components/CreateChannelModal"
import { useAuth } from "../context/AuthContext"

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "You do not have permission to perform this action."
  }
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

function statusTone(status: Channel["status"]): string {
  if (status === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-300"
}

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-6 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{helper}</p>
    </div>
  )
}

export default function Channels() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isAdmin, selectChannel } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | Channel["status"]>("ALL")
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: ChannelAPI.list,
  })

  const createChannelMutation = useMutation({
    mutationFn: (input: { name: string; code: string }) =>
      ChannelAPI.create(input),
    onSuccess: (created) => {
      queryClient.setQueryData<Channel[]>(
        ["channels"],
        (prev) => [...(prev ?? []), created]
      )
      setShowCreate(false)
      setPageMessage("Channel created successfully.")
    },
  })

  const deactivateChannelMutation = useMutation({
    mutationFn: (id: string) => ChannelAPI.deactivate(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<Channel[]>(
        ["channels"],
        (prev) =>
          (prev ?? []).map((channel) =>
            channel.id === updated.id ? updated : channel
          )
      )
      setPageMessage("Channel updated successfully.")
    },
  })

  async function createChannel(input: {
    name: string
    code: string
  }) {
    setPageMessage(null)
    await createChannelMutation.mutateAsync(input)
  }

  async function deactivateChannel(channel: Channel) {
    const confirmed = window.confirm(
      "Freeze " + channel.name + "? This will mark the channel inactive."
    )
    if (!confirmed) return

    setPageMessage(null)
    await deactivateChannelMutation.mutateAsync(channel.id)
  }

  const channels = channelsQuery.data ?? []
  const filteredChannels = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return channels.filter((channel) => {
      if (
        statusFilter !== "ALL" &&
        channel.status !== statusFilter
      ) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [channel.name, channel.code, channel.id]
        .filter(Boolean)
        .some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        )
    })
  }, [channels, search, statusFilter])

  const stats = useMemo(() => {
    const activeCount = channels.filter(
      (channel) => channel.status === "ACTIVE"
    ).length
    const inactiveCount = channels.length - activeCount

    return {
      total: channels.length,
      active: activeCount,
      inactive: inactiveCount,
    }
  }, [channels])

  if (channelsQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading channels...
      </div>
    )
  }

  if (channelsQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200 shadow-[var(--shadow-card)]">
        {toErrorMessage(channelsQuery.error)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,20,27,0.96))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--text-soft)]">
              CHANNEL DIRECTORY
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Channels
              </h1>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {isAdmin
                  ? "Manage channel access points, review current status, and open operational workspaces from one refined index."
                  : "Browse the channels available to your session and jump directly into the workspace you need."}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              disabled={createChannelMutation.isPending}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Create Channel
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Channels"
            value={formatCount(stats.total)}
            helper="All channels returned by the backend for this session."
          />
          <MetricCard
            label="Active"
            value={formatCount(stats.active)}
            helper="Channels currently available for live work."
          />
          <MetricCard
            label="Inactive"
            value={formatCount(stats.inactive)}
            helper="Channels already frozen or marked inactive."
          />
        </div>
      </section>

      {pageMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-[var(--shadow-card)]">
          {pageMessage}
        </div>
      )}

      {(createChannelMutation.error || deactivateChannelMutation.error) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[var(--shadow-card)]">
          {toErrorMessage(
            createChannelMutation.error ?? deactivateChannelMutation.error
          )}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Browse Channels</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Search by channel name, code, or id and narrow the list by status.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[480px] lg:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search channels"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "ALL" | Channel["status"]
                )
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)]"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
          <span>{formatCount(filteredChannels.length)} channel(s) shown</span>
          {(search || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setStatusFilter("ALL")
              }}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--accent-soft)]"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] overflow-hidden">
        {filteredChannels.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={channels.length === 0 ? "No channels yet" : "No channels match your filters"}
              description={
                channels.length === 0
                  ? isAdmin
                    ? "Create the first channel to start organizing channel-scoped workspaces."
                    : "No channels are available to this session yet."
                  : "Try a different search term or reset the status filter."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-[var(--bg-panel)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-4 text-left font-medium">Channel</th>
                  <th className="px-5 py-4 text-left font-medium">Code</th>
                  <th className="px-5 py-4 text-left font-medium">Status</th>
                  <th className="px-5 py-4 text-left font-medium">Channel ID</th>
                  <th className="px-5 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredChannels.map((channel) => {
                  const isFreezingThisRow =
                    deactivateChannelMutation.isPending &&
                    deactivateChannelMutation.variables === channel.id

                  return (
                    <tr
                      key={channel.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-[var(--text-primary)]">
                          {channel.name}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {channel.status === "ACTIVE"
                            ? "Ready for operational work"
                            : "Inactive channel"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-1 font-mono text-xs text-[var(--text-soft)]">
                          {channel.code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            statusTone(channel.status),
                          ].join(" ")}
                        >
                          {channel.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[var(--text-muted)]">
                        {channel.id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              selectChannel(channel.id)
                              navigate("/channels/" + channel.id)
                            }}
                            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                          >
                            Open
                          </button>

                          {isAdmin && (
                            channel.status === "ACTIVE" ? (
                              <button
                                type="button"
                                onClick={() => deactivateChannel(channel)}
                                disabled={isFreezingThisRow}
                                className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isFreezingThisRow ? "Freezing..." : "Freeze"}
                              </button>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">
                                Frozen
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate && isAdmin && (
        <CreateChannelModal
          onClose={() => setShowCreate(false)}
          onCreate={createChannel}
          isSubmitting={createChannelMutation.isPending}
          errorMessage={
            createChannelMutation.error
              ? toErrorMessage(createChannelMutation.error)
              : null
          }
        />
      )}
    </div>
  )
}
