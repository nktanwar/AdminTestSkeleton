import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, Copy } from "lucide-react"
import { AdminAPI, ApiError } from "../lib/api"
import type { AdminDealerOrderDetail, AdminDealerAnalyticsParams } from "../types/adminDealerAnalytics"
import { toUserFacingErrorMessage } from "../lib/errors"

function value(value: string | null | undefined): string {
  return value?.trim() || "—"
}

function label(valueToFormat: string | null | undefined): string {
  return value(valueToFormat).toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function money(amount: number | null | undefined): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "Unavailable"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount)
}

function date(dateValue: string | null | undefined): string {
  if (!dateValue) return "—"
  const parsed = new Date(dateValue)
  return Number.isNaN(parsed.getTime()) ? dateValue : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsed)
}

function normalizeOrder(order: AdminDealerOrderDetail): AdminDealerOrderDetail {
  return {
    ...order,
    customerId: order.customerId ?? order.customer?.id,
    customerName: order.customerName ?? order.customer?.name,
    customerPhoneNumber: order.customerPhoneNumber ?? order.customer?.phone,
    customerEmail: order.customerEmail ?? order.customer?.email,
    customerAddress: order.customerAddress ?? order.customer?.address,
    dealerId: order.dealerId ?? order.dealer?.id,
    dealerName: order.dealerName ?? order.dealer?.name,
    dealerPhone: order.dealerPhone ?? order.dealer?.phone,
    dealerEmail: order.dealerEmail ?? order.dealer?.email,
  }
}

function Badge({ children }: { children: string }) {
  return <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs font-semibold">{children}</span>
}

function OrderDetails({ order }: { order: AdminDealerOrderDetail }) {
  const address = order.customerAddress
  const pricing = order.pricing?.hasSnapshot ? order.pricing : null
  const [copied, setCopied] = useState(false)
  const items = order.items ?? []

  async function copyOrderId() {
    await navigator.clipboard.writeText(order.orderId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return <div className="grid gap-4 border-t border-[var(--border)] bg-[var(--bg-panel)] p-5 lg:grid-cols-2">
    <section><h4 className="font-semibold">Order Overview</h4><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><span>Order ID</span><span className="flex items-center justify-end gap-2 text-right font-mono">{order.orderId}<button type="button" onClick={copyOrderId} aria-label="Copy order ID" title="Copy order ID" className="rounded p-1 hover:bg-[var(--accent-soft)]"><Copy className="h-3.5 w-3.5" /></button>{copied && <span className="text-xs text-emerald-300">Copied</span>}</span><span>Created</span><span className="text-right">{date(order.createdAt)}</span><span>Updated</span><span className="text-right">{date(order.updatedAt)}</span><span>Order state</span><span className="text-right"><Badge>{label(order.orderState)}</Badge></span><span>Payment</span><span className="text-right"><Badge>{label(order.paymentStatus)}</Badge> <span className="ml-1 text-xs text-[var(--text-muted)]">{label(order.paymentMethod)}</span></span></div></section>
    <section><h4 className="font-semibold">Customer Details</h4><div className="mt-3 space-y-1 text-sm"><p>{value(order.customerName)}</p><p>{value(order.customerPhoneNumber)}</p><p>{value(order.customerEmail)}</p><p className="text-[var(--text-muted)]">Customer ID: {value(order.customerId)}</p><p className="mt-2 text-[var(--text-muted)]">{address ? [address.street, address.landmark, address.city, address.state, address.zipCode, address.country].filter(Boolean).join(", ") || "Address unavailable" : "Address unavailable"}</p></div></section>
    <section><h4 className="font-semibold">Order Items</h4><div className="mt-3 space-y-3">{items.length ? items.map((item, index) => <div key={`${item.productId}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm"><div className="font-semibold">{value(item.name) !== "—" ? item.name : item.productId}</div><div className="mt-1 text-[var(--text-muted)]">SKU: {value(item.sku)} · Product ID: {item.productId}</div><div className="mt-1">Quantity: {item.quantity}{item.color?.length ? ` · Color: ${item.color.join(", ")}` : ""}{item.price != null ? ` · Price: ${money(item.price)}` : ""}</div>{item.description && <p className="mt-1 text-[var(--text-muted)]">{item.description}</p>}{item.configuration && <div className="mt-2 rounded-lg bg-[var(--bg-panel)] p-2 text-xs">Configuration: {value(item.configuration.configurationId)}{item.configuration.version != null ? ` · v${item.configuration.version}` : ""}<div className="mt-1">{item.configuration.answers?.length ? `${item.configuration.answers.length} answer(s) returned` : "Answer details unavailable"}</div></div>}</div>) : <p className="text-sm text-[var(--text-muted)]">No order items returned.</p>}</div></section>
    <section><h4 className="font-semibold">Pricing Breakdown</h4>{pricing ? <div className="mt-3 space-y-3 text-sm"><div className="grid grid-cols-2 gap-3"><span>Dealer cost</span><strong className="text-right">{money(pricing.totalDealerCost)}</strong><span>Original customer amount</span><strong className="text-right">{money(pricing.originalCustomerTotal)}</strong><span>Discount</span><strong className="text-right">{money(pricing.discountAmount)}</strong><span>Discount percentage</span><strong className="text-right">{pricing.discountPercent ?? "Unavailable"}%</strong><span>Final customer amount</span><strong className="text-right">{money(pricing.finalCustomerTotal)}</strong><span>Dealer profit</span><strong className="text-right text-emerald-300">{money(pricing.dealerProfit)}</strong></div>{pricing.items?.length ? <div className="border-t border-[var(--border)] pt-3"><p className="font-semibold">Item pricing</p>{pricing.items.map((item, index) => <div key={`${String(item.productId ?? index)}-${index}`} className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]"><span>Product: {String(item.productId ?? "—")}</span><span className="text-right">Qty: {String(item.quantity ?? "—")}</span><span>Dealer unit: {money(typeof item.dealerUnitPrice === "number" ? item.dealerUnitPrice : null)}</span><span className="text-right">Customer unit: {money(typeof item.customerUnitPrice === "number" ? item.customerUnitPrice : null)}</span><span>Dealer total: {money(typeof item.dealerTotal === "number" ? item.dealerTotal : null)}</span><span className="text-right">Customer total: {money(typeof item.customerTotal === "number" ? item.customerTotal : null)}</span></div>)}</div> : null}</div> : <p className="mt-3 text-sm text-amber-300">Pricing snapshot unavailable.</p>}</section>
  </div>
}

export default function AdminDealerOrdersPanel({ dealerId, filters }: { dealerId: string; filters: Omit<AdminDealerAnalyticsParams, "dealerId" | "page" | "size"> }) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const query = useQuery({ queryKey: ["admin-dealer-orders", dealerId, filters, page, size], queryFn: () => AdminAPI.getDealerOrders(dealerId, { ...filters, page, size }), placeholderData: (previous) => previous })
  const orders = (query.data?.orders ?? []).map(normalizeOrder)
  const error = query.error instanceof ApiError && query.error.status === 403 ? "You do not have permission to view dealer orders." : toUserFacingErrorMessage(query.error, "Unable to load dealer orders.")

  if (query.isLoading) return <div className="border-t border-[var(--border)] bg-[var(--bg-panel)] p-5 text-sm text-[var(--text-muted)]">Loading dealer orders...</div>
  if (query.error && !query.data) return <div className="border-t border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}<button type="button" onClick={() => query.refetch()} className="ml-3 rounded-lg border border-red-300/30 px-3 py-1.5 font-semibold">Retry</button></div>

  return <div className="border-t border-[var(--border)] bg-[var(--bg-panel)] p-4"><div className="mb-3 flex items-center justify-between gap-3"><h4 className="font-semibold">Dealer Orders</h4>{query.isFetching && <span className="text-xs text-[var(--text-muted)]">Refreshing...</span>}</div>{orders.length ? <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]"><tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2 text-right">Customer amount</th><th className="px-3 py-2 text-right">Dealer cost</th><th className="px-3 py-2 text-right">Profit</th><th className="px-3 py-2">Details</th></tr></thead><tbody>{orders.map((order) => { const open = expandedOrderId === order.orderId; const pricing = order.pricing?.hasSnapshot ? order.pricing : null; return <><tr key={order.orderId} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-mono text-xs">{order.orderId}</td><td className="px-3 py-3"><div>{value(order.customerName)}</div><div className="text-xs text-[var(--text-muted)]">{value(order.customerPhoneNumber)}</div></td><td className="whitespace-nowrap px-3 py-3 text-[var(--text-muted)]">{date(order.createdAt)}</td><td className="px-3 py-3"><Badge>{label(order.orderState)}</Badge></td><td className="px-3 py-3"><Badge>{label(order.paymentStatus)}</Badge><div className="mt-1 text-xs text-[var(--text-muted)]">{label(order.paymentMethod)}</div></td><td className="px-3 py-3 text-right">{money(pricing?.finalCustomerTotal)}</td><td className="px-3 py-3 text-right">{money(pricing?.totalDealerCost)}</td><td className="px-3 py-3 text-right text-emerald-300">{money(pricing?.dealerProfit)}</td><td className="px-3 py-3"><button type="button" onClick={() => setExpandedOrderId(open ? null : order.orderId)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{open ? "Hide" : "View"}</button></td></tr>{open && <tr key={`${order.orderId}-details`}><td colSpan={9}><OrderDetails order={order} /></td></tr>}</> })}</tbody></table></div> : <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">No orders found for this dealer and the selected filters.</div>}{query.data?.pagination && query.data.pagination.totalPages > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm"><label className="flex items-center gap-2 text-[var(--text-muted)]">Rows<select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); setExpandedOrderId(null) }} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-[var(--text-primary)]"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><span>Page {page + 1} of {query.data.pagination.totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 0 || query.isFetching} onClick={() => { setPage((current) => current - 1); setExpandedOrderId(null) }} className="rounded-lg border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={page + 1 >= query.data.pagination.totalPages || query.isFetching} onClick={() => { setPage((current) => current + 1); setExpandedOrderId(null) }} className="rounded-lg border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}</div>
}
