import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Fragment } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { AdminAPI, ApiError, ChannelAPI } from "../lib/api"
import type {
  AdminDealerAnalyticsItem,
  AdminDealerAnalyticsParams,
  AdminDealerAnalyticsResponse,
} from "../types/adminDealerAnalytics"
import { toUserFacingErrorMessage } from "../lib/errors"
import AdminDealerOrdersPanel from "./AdminDealerOrdersPanel"

const DEFAULT_SIZE = 20
type FilterState = {
  channelId: string
  dealerId: string
  orderState: string
  paymentStatus: string
  from: string
  to: string
}

const EMPTY_FILTERS: FilterState = {
  channelId: "",
  dealerId: "",
  orderState: "",
  paymentStatus: "",
  from: "",
  to: "",
}

function formatMoney(value: number | undefined | null): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(typeof value === "number" && Number.isFinite(value) ? value : 0)
}

function formatCount(value: number | undefined | null): string {
  return (typeof value === "number" && Number.isFinite(value) ? value : 0).toLocaleString("en-IN")
}

function labelize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function dateRangeToParams(filters: FilterState): Pick<AdminDealerAnalyticsParams, "from" | "to"> {
  const result: Pick<AdminDealerAnalyticsParams, "from" | "to"> = {}
  if (filters.from) result.from = new Date(`${filters.from}T00:00:00`).toISOString()
  if (filters.to) result.to = new Date(`${filters.to}T23:59:59.999`).toISOString()
  return result
}

function buildParams(filters: FilterState, page: number, size: number): AdminDealerAnalyticsParams {
  return {
    ...(filters.channelId ? { channelId: filters.channelId } : {}),
    ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
    ...(filters.orderState ? { orderState: filters.orderState } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...dateRangeToParams(filters),
    page,
    size,
  }
}

function Distribution({ title, values, tone }: { title: string; values: Record<string, number>; tone: string }) {
  const entries = Object.entries(values ?? {})
  const total = entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0)
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-muted)]">No orders match the selected filters.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {entries.map(([key, rawValue]) => {
            const value = Number(rawValue) || 0
            const percentage = total ? Math.round((value / total) * 100) : 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{labelize(key)}</span>
                  <span className="text-[var(--text-muted)]">{formatCount(value)} · {percentage}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--bg-panel)]" aria-hidden="true">
                  <div className={`h-2 rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function Metric({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-4 text-2xl font-semibold tracking-tight ${accent}`}>{value}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{note}</p>
    </article>
  )
}

function DealerRow({ dealer, channelNames, expanded, onToggle }: { dealer: AdminDealerAnalyticsItem; channelNames: Map<string, string>; expanded: boolean; onToggle: () => void }) {
  const completed = Object.entries(dealer.ordersByState ?? {}).reduce(
    (total, [state, value]) => total + (state.toUpperCase() === "COMPLETED" ? Number(value) || 0 : 0), 0
  )
  const pending = Object.entries(dealer.ordersByPaymentStatus ?? {}).reduce(
    (total, [status, value]) => total + (status.toUpperCase() === "PENDING" ? Number(value) || 0 : 0), 0
  )
  const channels = dealer.channelIds.map((id) => channelNames.get(id) ?? "Unknown channel")
  return (
    <tr className="border-t border-[var(--border)] align-top">
      <td className="px-4 py-4"><div className="flex items-start gap-2"><button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} orders for ${dealer.dealerName || "dealer"}`} className="mt-0.5 rounded-lg border border-emerald-400/60 bg-emerald-500/15 p-1.5 text-emerald-200 hover:bg-emerald-500/25">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button><div><div className="font-semibold">{dealer.dealerName || "Unnamed dealer"}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{dealer.email || "No email"}</div></div></div></td>
      <td className="px-4 py-4 text-sm text-[var(--text-muted)]">{dealer.phone || "No phone"}</td>
      <td className="px-4 py-4 text-sm">{channels.length ? channels.join(", ") : "Unknown channel"}</td>
      <td className="px-4 py-4 text-right">{formatCount(dealer.totalCustomers)}</td>
      <td className="px-4 py-4 text-right">{formatCount(dealer.totalOrders)}<div className="text-xs text-[var(--text-muted)]">{formatCount(completed)} completed</div></td>
      <td className="px-4 py-4 text-right">{formatCount(pending)}</td>
      <td className="px-4 py-4 text-right whitespace-nowrap">{formatMoney(dealer.totalDealerCost)}</td>
      <td className="px-4 py-4 text-right whitespace-nowrap">{formatMoney(dealer.totalCustomerAmount)}</td>
      <td className="px-4 py-4 text-right whitespace-nowrap text-emerald-300">{formatMoney(dealer.totalDealerProfit)}</td>
      <td className="px-4 py-4 text-right whitespace-nowrap">{formatCount(dealer.ordersWithPricingSnapshot)} / {formatCount(dealer.totalOrders)}</td>
    </tr>
  )
}

export default function AdminDealerAnalytics() {
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [dateError, setDateError] = useState<string | null>(null)
  const [expandedDealerId, setExpandedDealerId] = useState<string | null>(null)

  const channelsQuery = useQuery({ queryKey: ["admin-analytics-channels"], queryFn: ChannelAPI.list })
  const analyticsQuery = useQuery({
    queryKey: ["admin-dealer-order-analytics", filters, page, size],
    queryFn: () => AdminAPI.getDealerOrderAnalytics(buildParams(filters, page, size)),
    placeholderData: (previous) => previous,
  })

  const data: AdminDealerAnalyticsResponse | undefined = analyticsQuery.data
  const dealerOptions = useMemo(() => data?.dealers ?? [], [data?.dealers])
  const channelNames = useMemo(() => new Map((channelsQuery.data ?? []).map((channel) => [channel.id, channel.name])), [channelsQuery.data])
  const activeChannels = (channelsQuery.data ?? []).filter((channel) => channel.status === "ACTIVE")

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    if (draft.from && draft.to && draft.from > draft.to) {
      setDateError("The start date must be before or equal to the end date.")
      return
    }
    setDateError(null)
    setPage(0)
    setFilters({ ...draft })
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setDateError(null)
    setPage(0)
  }

  function updateFilter(key: keyof FilterState, value: string) {
    setDraft((current) => ({ ...current, [key]: value, ...(key === "channelId" ? { dealerId: "" } : {}) }))
  }

  function orderFilters(): Omit<AdminDealerAnalyticsParams, "dealerId" | "page" | "size"> {
    return {
      ...(filters.channelId ? { channelId: filters.channelId } : {}),
      ...(filters.orderState ? { orderState: filters.orderState } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
      ...(filters.from ? { from: dateRangeToParams(filters).from } : {}),
      ...(filters.to ? { to: dateRangeToParams(filters).to } : {}),
    }
  }

  if (analyticsQuery.isLoading && !data) {
    return <section className="space-y-5"><div><h2 className="text-2xl font-semibold">Dealer Analytics</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Loading dealer activity and financial performance...</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]" />)}</div></section>
  }

  if (analyticsQuery.error && !data) {
    const message = analyticsQuery.error instanceof ApiError && analyticsQuery.error.status === 403 ? "You do not have permission to view dealer analytics." : toUserFacingErrorMessage(analyticsQuery.error, "Unable to load dealer analytics.")
    return <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200"><div className="flex items-center justify-between gap-4"><p>{message}</p><button type="button" onClick={() => analyticsQuery.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-red-300/30 px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Retry</button></div></section>
  }

  const summary = data?.summary
  const orderStateOptions = Object.keys(summary?.ordersByState ?? {}).sort()
  const paymentStatusOptions = Object.keys(summary?.ordersByPaymentStatus ?? {}).sort()
  return (
    <section className="space-y-5" aria-labelledby="dealer-analytics-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="dealer-analytics-heading" className="text-2xl font-semibold">Dealer Analytics</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Monitor dealer activity, customer reach, order status, and financial performance.</p></div>{analyticsQuery.isFetching && <span className="text-xs text-[var(--text-muted)]" role="status">Updating analytics...</span>}</div>

      <form onSubmit={applyFilters} className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-sm"><span className="mb-2 block text-[var(--text-muted)]">Channel</span><select value={draft.channelId} onChange={(event) => updateFilter("channelId", event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2.5"><option value="">All active channels</option>{activeChannels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label>
          <label className="text-sm"><span className="mb-2 block text-[var(--text-muted)]">Dealer</span><select value={draft.dealerId} onChange={(event) => updateFilter("dealerId", event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2.5"><option value="">All dealers</option>{dealerOptions.map((dealer) => <option key={dealer.dealerId} value={dealer.dealerId}>{dealer.dealerName || dealer.email}</option>)}</select></label>
          <label className="text-sm"><span className="mb-2 block text-[var(--text-muted)]">Order state</span><select value={draft.orderState} onChange={(event) => updateFilter("orderState", event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2.5"><option value="">All states</option>{orderStateOptions.map((state) => <option key={state} value={state}>{labelize(state)}</option>)}</select></label>
          <label className="text-sm"><span className="mb-2 block text-[var(--text-muted)]">Payment status</span><select value={draft.paymentStatus} onChange={(event) => updateFilter("paymentStatus", event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2.5"><option value="">All payment statuses</option>{paymentStatusOptions.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select></label>
          <label className="text-sm"><span className="mb-2 block text-[var(--text-muted)]">From</span><input type="date" value={draft.from} onChange={(event) => updateFilter("from", event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2.5" /></label>
          <label className="text-sm"><span className="mb-2 block text-[var(--text-muted)]">To</span><input type="date" value={draft.to} onChange={(event) => updateFilter("to", event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2.5" /></label>
        </div>
        {dateError && <p className="mt-3 text-sm text-red-300" role="alert">{dateError}</p>}
        <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black">Apply Filters</button><button type="button" onClick={clearFilters} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--accent-soft)]">Clear Filters</button></div>
      </form>

      {analyticsQuery.error && data && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">Unable to refresh dealer analytics. Showing the last successful result.</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total Dealers" value={formatCount(summary?.totalDealers)} note="All matching dealers" accent="text-sky-300" />
        <Metric label="Customers Served" value={formatCount(summary?.totalCustomers)} note="Distinct matching customers" accent="text-amber-300" />
        <Metric label="Total Orders" value={formatCount(summary?.totalOrders)} note="Orders matching filters" accent="text-fuchsia-300" />
        <Metric label="Dealer Cost" value={formatMoney(summary?.totalDealerCost)} note="Available pricing snapshots" accent="text-orange-300" />
        <Metric label="Customer Amount" value={formatMoney(summary?.totalCustomerAmount)} note="Available pricing snapshots" accent="text-emerald-300" />
        <Metric label="Dealer Profit" value={formatMoney(summary?.totalDealerProfit)} note="Snapshot-based total" accent="text-rose-300" />
      </div>
      <p className="text-xs text-[var(--text-muted)]">Financial totals are based on stored pricing snapshots. Coverage: {formatCount(summary?.ordersWithPricingSnapshot)} of {formatCount(summary?.totalOrders)} matching orders.</p>

      <div className="grid gap-4 lg:grid-cols-2"><Distribution title="Orders by state" values={summary?.ordersByState ?? {}} tone="bg-sky-400" /><Distribution title="Payments by status" values={summary?.ordersByPaymentStatus ?? {}} tone="bg-emerald-400" /></div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]"><div className="flex flex-col gap-2 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-semibold">Dealer Performance</h3><p className="text-sm text-[var(--text-muted)]">Summary covers all filtered results; expand a dealer to inspect individual orders.</p></div>{data?.pagination && data.pagination.totalElements > 0 && <span className="text-sm text-[var(--text-muted)]">{formatCount(data.pagination.totalElements)} dealers</span>}</div>{data?.dealers.length ? <div className="overflow-x-auto"><table className="min-w-[1200px] w-full text-left text-sm"><thead className="bg-[var(--bg-panel)] text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]"><tr><th scope="col" className="px-4 py-3">Dealer</th><th scope="col" className="px-4 py-3">Contact</th><th scope="col" className="px-4 py-3">Channels</th><th scope="col" className="px-4 py-3 text-right">Customers</th><th scope="col" className="px-4 py-3 text-right">Orders</th><th scope="col" className="px-4 py-3 text-right">Pending payments</th><th scope="col" className="px-4 py-3 text-right">Dealer cost</th><th scope="col" className="px-4 py-3 text-right">Customer amount</th><th scope="col" className="px-4 py-3 text-right">Profit</th><th scope="col" className="px-4 py-3 text-right">Pricing coverage</th></tr></thead><tbody>{data.dealers.map((dealer) => { const expanded = expandedDealerId === dealer.dealerId; return <Fragment key={dealer.dealerId}><DealerRow dealer={dealer} channelNames={channelNames} expanded={expanded} onToggle={() => setExpandedDealerId(expanded ? null : dealer.dealerId)} />{expanded && <tr><td colSpan={10} className="p-0"><AdminDealerOrdersPanel dealerId={dealer.dealerId} filters={orderFilters()} /></td></tr>}</Fragment> })}</tbody></table></div> : <div className="p-8 text-center"><p className="font-semibold">No dealer analytics found for the selected filters.</p><p className="mt-2 text-sm text-[var(--text-muted)]">Try clearing the filters or choosing a different date range.</p></div>}
        {data?.pagination && data.pagination.totalPages > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4"><label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">Rows<select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0) }} className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1.5 text-[var(--text-primary)]"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="flex items-center gap-3 text-sm"><span>Page {(data.pagination.page ?? page) + 1} of {data.pagination.totalPages}</span><button type="button" disabled={page <= 0 || analyticsQuery.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-lg border border-[var(--border)] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" disabled={page + 1 >= data.pagination.totalPages || analyticsQuery.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div>}
      </div>
    </section>
  )
}
