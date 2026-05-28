import { useQuery } from "@tanstack/react-query"
import { DealerAPI } from "../lib/api"

function formatStatusLabel(value: boolean, enabled: string, disabled: string) {
  return value ? enabled : disabled
}

export default function DealerChannels() {
  const channelsQuery = useQuery({
    queryKey: ["dealer-channels"],
    queryFn: DealerAPI.listChannels,
  })

  if (channelsQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Loading channels...
      </div>
    )
  }

  if (channelsQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {channelsQuery.error instanceof Error
          ? channelsQuery.error.message
          : "Failed to load channels."}
      </div>
    )
  }

  const channels = channelsQuery.data ?? []

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold tracking-tight">Your Channels</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          These are the channels your dealer account can access right now.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {channels.map((channel) => (
          <article
            key={channel.id}
            className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{channel.name}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Code: {channel.code}
                </p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {channel.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Wallet
                </div>
                <div className="mt-2 text-sm font-medium">
                  {formatStatusLabel(
                    channel.walletEnabled,
                    "Enabled",
                    "Disabled"
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Knowledge Center
                </div>
                <div className="mt-2 text-sm font-medium">
                  {formatStatusLabel(
                    channel.knowledgeCenterAccess,
                    "Accessible",
                    "Knowledge Center Disabled"
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          No channels are assigned to this dealer account yet.
        </div>
      )}
    </div>
  )
}
