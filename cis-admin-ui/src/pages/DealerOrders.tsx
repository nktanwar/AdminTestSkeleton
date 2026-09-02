import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  History,
  Loader2,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  Save,
} from "lucide-react"
import {
  ApiError,
  DealerAPI,
  type DealerAnalyticsPaymentStatus,
  type DealerCheckoutItemRequest,
  type DealerCheckoutResponse,
  type DealerOrderAnalyticsResponse,
  type DealerOrderInternalResponse,
  type DealerOrderPaymentStatus,
  type DealerPricingChannel,
} from "../lib/api"
import { toUserFacingErrorMessage } from "../lib/errors"

const PAGE_SIZE = 50

type TabKey = "orders" | "analytics"
type PricingState = "IDLE" | "CALCULATING" | "CALCULATED" | "ERROR"

function formatMoney(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | undefined | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getPageContent<T>(page: { content?: T[] } | undefined): T[] {
  return page?.content ?? []
}

function getOrderCustomer(order: DealerOrderInternalResponse): string {
  return order.customerName?.trim() || "Customer"
}

function formatAddress(order: DealerOrderInternalResponse): string {
  const address = order.customerAddress
  if (!address) return "-"
  return [
    address.street,
    address.landmark,
    address.city,
    address.state,
    address.zipCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ")
}

function buildCheckoutItems(
  order: DealerOrderInternalResponse
): DealerCheckoutItemRequest[] {
  return order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    configurationId: item.configuration?.configurationId ?? null,
    configurationVersion: item.configuration?.version ?? null,
    answers: item.configuration?.answers ?? [],
  }))
}

function getDisplayPaymentStatus(
  order: DealerOrderInternalResponse,
  analytics?: DealerOrderAnalyticsResponse
): DealerOrderPaymentStatus {
  return analytics?.paymentStatus ?? order.paymentStatus
}

function statusClass(status: string): string {
  if (status === "SUCCESS") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }
  if (status === "PENDING") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200"
  }
  return "border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)]"
}

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
        value
      )}`}
    >
      {value}
    </span>
  )
}

function ErrorBox({
  error,
  fallback,
  onRetry,
}: {
  error: unknown
  fallback: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <div className="flex-1">
          <p>
            {error instanceof Error
              ? toUserFacingErrorMessage(error, fallback)
              : fallback}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold hover:bg-red-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  strong,
  tone = "default",
}: {
  label: string
  value: string
  strong?: boolean
  tone?: "default" | "negative"
}) {
  const valueClass =
    tone === "negative"
      ? "text-xl font-bold text-red-400"
      : strong
        ? "text-xl font-bold text-[var(--accent)]"
        : "font-semibold"

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 truncate ${valueClass}`}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

function OrderStateLabel({
  analytics,
}: {
  analytics?: DealerOrderAnalyticsResponse
}) {
  if (!analytics) {
    return <Badge value="NOT STORED" />
  }
  if (analytics.paymentStatus === "SUCCESS") {
    return <Badge value="SUCCESS" />
  }
  return <Badge value="PENDING" />
}

function ChannelSelector({
  channels,
  saving,
  onSetDefault,
}: {
  channels: DealerPricingChannel[]
  saving: boolean
  onSetDefault: (channelId: string) => void
}) {
  const defaultChannel = channels.find((channel) => channel.isDefault)

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Pricing Channel
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {defaultChannel?.name ?? "No default channel"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Calculations use the default channel saved by the backend.
          </p>
        </div>
        <select
          value={defaultChannel?.channelId ?? ""}
          disabled={saving || channels.length === 0}
          onChange={(event) => onSetDefault(event.target.value)}
          className="min-w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="" disabled>
            Select default channel
          </option>
          {channels.map((channel) => (
            <option key={channel.channelId} value={channel.channelId}>
              {channel.name} ({channel.code})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function PricingPreview({
  pricing,
  state,
  error,
  onRetry,
}: {
  pricing: DealerCheckoutResponse | null
  state: PricingState
  error: unknown
  onRetry: () => void
}) {
  if (state === "CALCULATING") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
        Calculating dealer pricing...
      </div>
    )
  }

  if (state === "ERROR") {
    return (
      <ErrorBox
        error={error}
        fallback="Pricing is not configured for this product. Please contact the administrator."
        onRetry={onRetry}
      />
    )
  }

  if (!pricing) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-muted)]">
        Select an unstored order to calculate pricing.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-3">
        <ReceiptText className="h-5 w-5 text-[var(--accent)]" />
        <h2 className="text-lg font-semibold">Dealer Pricing</h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Stat label="Dealer Cost" value={formatMoney(pricing.totalDealerCost)} />
        <Stat
          label="Original Customer Price"
          value={formatMoney(pricing.totalCustomerPrice)}
        />
        <Stat
          label="Margin"
          value={formatMoney(pricing.totalMargin)}
          tone={pricing.totalMargin < 0 ? "negative" : "default"}
        />
        <Stat
          label="Discount"
          value={`${pricing.discountPercent}% / ${formatMoney(
            pricing.discountAmount
          )}`}
        />
        <Stat
          label="Final Customer Price"
          value={formatMoney(pricing.finalCustomerTotal)}
          strong
        />
        <Stat
          label="Final Dealer Profit"
          value={formatMoney(pricing.finalMargin)}
          strong
          tone={pricing.finalMargin < 0 ? "negative" : "default"}
        />
      </div>
    </div>
  )
}

function AnalyticsSummary({
  analytics,
  onPaymentDone,
  paymentLoading,
}: {
  analytics: DealerOrderAnalyticsResponse
  onPaymentDone: (orderId: string) => void
  paymentLoading: boolean
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Analytics Snapshot
          </p>
          <h2 className="mt-1 text-lg font-semibold">{analytics.orderId}</h2>
        </div>
        <Badge
          value={
            analytics.paymentStatus === "SUCCESS"
              ? "FINALIZED"
              : "PAYMENT PENDING"
          }
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Stat
          label="Dealer Cost"
          value={formatMoney(analytics.totalDealerCost)}
        />
        <Stat
          label="Original Customer Total"
          value={formatMoney(analytics.originalCustomerTotal)}
        />
        <Stat
          label="Discount"
          value={`${analytics.discountPercent}% / ${formatMoney(
            analytics.discountAmount
          )}`}
        />
        <Stat
          label="Final Customer Total"
          value={formatMoney(analytics.finalCustomerTotal)}
          strong
        />
        <Stat
          label="Dealer Profit"
          value={formatMoney(analytics.dealerProfit)}
          strong
          tone={analytics.dealerProfit < 0 ? "negative" : "default"}
        />
        <Stat label="Pricing Channel" value={analytics.pricingChannelId} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
        <div className="text-sm text-[var(--text-muted)]">
          Payment:{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {analytics.paymentStatus === "SUCCESS" ? "Completed" : "Pending"}
          </span>
        </div>
        {analytics.paymentStatus === "PENDING" && (
          <button
            type="button"
            disabled={paymentLoading}
            onClick={() => onPaymentDone(analytics.orderId)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paymentLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Mark Payment Done
          </button>
        )}
      </div>
    </div>
  )
}

export default function DealerOrders() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>("orders")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [paymentStatus, setPaymentStatus] =
    useState<DealerAnalyticsPaymentStatus>("PENDING")
  const [storeError, setStoreError] = useState<unknown>(null)
  const [paymentError, setPaymentError] = useState<unknown>(null)

  const ordersQuery = useQuery({
    queryKey: ["dealer-orders", 0, PAGE_SIZE],
    queryFn: () => DealerAPI.listOrders(0, PAGE_SIZE),
  })
  const analyticsQuery = useQuery({
    queryKey: ["dealer-order-analytics", 0, PAGE_SIZE],
    queryFn: () => DealerAPI.listOrderAnalytics(0, PAGE_SIZE),
  })
  const channelsQuery = useQuery({
    queryKey: ["dealer-pricing-channels"],
    queryFn: DealerAPI.listPricingChannels,
  })

  const orders = getPageContent(ordersQuery.data)
  const analyticsRecords = getPageContent(analyticsQuery.data)
  const analyticsByOrderId = useMemo(() => {
    return new Map(
      analyticsRecords.map((record) => [record.orderId, record])
    )
  }, [analyticsRecords])
  const effectiveSelectedOrderId = selectedOrderId ?? orders[0]?.orderId ?? null
  const selectedOrder = useMemo(() => {
    return (
      orders.find((order) => order.orderId === effectiveSelectedOrderId) ??
      null
    )
  }, [orders, effectiveSelectedOrderId])
  const selectedAnalytics = selectedOrder
    ? analyticsByOrderId.get(selectedOrder.orderId)
    : undefined
  const checkoutItems = useMemo(
    () => (selectedOrder ? buildCheckoutItems(selectedOrder) : []),
    [selectedOrder]
  )
  const canPreview =
    Boolean(selectedOrder) &&
    !selectedAnalytics &&
    checkoutItems.length > 0 &&
    !channelsQuery.isError

  const pricingQuery = useQuery({
    queryKey: [
      "dealer-order-pricing",
      selectedOrder?.orderId,
      discountPercent,
    ],
    queryFn: () =>
      DealerAPI.calculatePricing({
        discountPercent,
        items: checkoutItems,
      }),
    enabled: canPreview,
  })
  const pricingState: PricingState = !canPreview
    ? "IDLE"
    : pricingQuery.isFetching
      ? "CALCULATING"
      : pricingQuery.error
        ? "ERROR"
        : pricingQuery.data
          ? "CALCULATED"
          : "IDLE"

  const refreshAnalytics = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["dealer-order-analytics"],
    })
  }

  const setDefaultChannelMutation = useMutation({
    mutationFn: DealerAPI.setDefaultPricingChannel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dealer-pricing-channels"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["dealer-order-pricing"],
      })
    },
  })

  const storeMutation = useMutation({
    mutationFn: () =>
      DealerAPI.addOrderSnapshot({
        orderId: selectedOrder!.orderId,
        discountPercent,
        items: checkoutItems,
        paymentStatus,
      }),
    onMutate: () => {
      setStoreError(null)
    },
    onSuccess: async () => {
      await refreshAnalytics()
      setActiveTab("orders")
    },
    onError: async (error) => {
      setStoreError(error)
      if (!(error instanceof ApiError) || error.status === 409 || error.status >= 500) {
        await refreshAnalytics()
      }
    },
  })

  const paymentDoneMutation = useMutation({
    mutationFn: DealerAPI.markOrderPaymentDone,
    onMutate: () => {
      setPaymentError(null)
    },
    onSuccess: async () => {
      await refreshAnalytics()
    },
    onError: (error) => {
      setPaymentError(error)
    },
  })

  const handlePaymentDone = (orderId: string) => {
    const confirmed = window.confirm(
      "Mark this payment as completed? This will finalize the order's analytics record."
    )
    if (confirmed) {
      paymentDoneMutation.mutate(orderId)
    }
  }

  const boundedDiscount = (value: string) => {
    const next = Number(value)
    if (!Number.isFinite(next)) {
      setDiscountPercent(0)
      return
    }
    setDiscountPercent(Math.min(100, Math.max(0, next)))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              Dealer Orders
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Review, price, store, and finalize orders
            </h1>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-1">
            {[
              { key: "orders" as const, label: "Orders", icon: PackageOpen },
              { key: "analytics" as const, label: "Analytics", icon: History },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    activeTab === tab.key
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {activeTab === "orders" ? (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Order List</h2>
              <button
                type="button"
                onClick={() => {
                  ordersQuery.refetch()
                  analyticsQuery.refetch()
                }}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-muted)] hover:bg-[var(--accent-soft)]"
                title="Refresh orders"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {ordersQuery.isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg-panel)]"
                  />
                ))}
              </div>
            )}

            {ordersQuery.error && (
              <ErrorBox
                error={ordersQuery.error}
                fallback="Failed to load dealer orders."
                onRetry={() => ordersQuery.refetch()}
              />
            )}

            {!ordersQuery.isLoading && orders.length === 0 && !ordersQuery.error && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-5 text-sm text-[var(--text-muted)]">
                No dealer orders were returned.
              </div>
            )}

            <div className="space-y-3">
              {orders.map((order) => {
                const analytics = analyticsByOrderId.get(order.orderId)
                const active = effectiveSelectedOrderId === order.orderId
                return (
                  <button
                    key={order.orderId}
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(order.orderId)
                      setDiscountPercent(0)
                      setPaymentStatus("PENDING")
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {getOrderCustomer(order)}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                          {order.orderId}
                        </p>
                      </div>
                      <OrderStateLabel analytics={analytics} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                      <span>{order.items.length} item(s)</span>
                      <span className="text-right">{formatMoney(order.totalPrice)}</span>
                      <span>{order.state}</span>
                      <span className="text-right">
                        {getDisplayPaymentStatus(order, analytics)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-5">
            {channelsQuery.error && (
              <ErrorBox
                error={channelsQuery.error}
                fallback="Failed to load pricing channels."
                onRetry={() => channelsQuery.refetch()}
              />
            )}

            <ChannelSelector
              channels={channelsQuery.data ?? []}
              saving={setDefaultChannelMutation.isPending}
              onSetDefault={(channelId) => {
                if (channelId) setDefaultChannelMutation.mutate(channelId)
              }}
            />
            {setDefaultChannelMutation.error && (
              <ErrorBox
                error={setDefaultChannelMutation.error}
                fallback="Failed to update the default pricing channel."
              />
            )}

            {!selectedOrder && !ordersQuery.isLoading && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
                Select an order to review pricing.
              </div>
            )}

            {selectedOrder && (
              <>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Order Detail
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">
                        {getOrderCustomer(selectedOrder)}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {selectedOrder.orderId}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge value={selectedOrder.state} />
                      <Badge
                        value={getDisplayPaymentStatus(
                          selectedOrder,
                          selectedAnalytics
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <Stat
                      label="Customer Phone"
                      value={selectedOrder.customerPhoneNumber ?? "-"}
                    />
                    <Stat
                      label="Order Total"
                      value={formatMoney(selectedOrder.totalPrice)}
                    />
                    <Stat
                      label="Created"
                      value={formatDate(selectedOrder.createdAt)}
                    />
                  </div>
                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    {formatAddress(selectedOrder)}
                  </p>

                  <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)]">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.sku ?? item.name}`}
                        className="grid gap-3 border-b border-[var(--border)] bg-[var(--bg-panel)] p-4 last:border-b-0 md:grid-cols-[1fr_90px_140px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {item.sku ?? item.productId}
                          </p>
                          {item.configuration && (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              Config {item.configuration.configurationId} v
                              {item.configuration.version}
                            </p>
                          )}
                        </div>
                        <div className="text-sm">
                          Qty{" "}
                          <span className="font-semibold">{item.quantity}</span>
                        </div>
                        <div className="text-sm font-semibold md:text-right">
                          {formatMoney(item.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedAnalytics ? (
                  <AnalyticsSummary
                    analytics={selectedAnalytics}
                    onPaymentDone={handlePaymentDone}
                    paymentLoading={paymentDoneMutation.isPending}
                  />
                ) : (
                  <>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="block text-sm font-semibold">
                          Discount Percent
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={discountPercent}
                            onChange={(event) => boundedDiscount(event.target.value)}
                            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 outline-none focus:border-[var(--accent)]"
                          />
                        </label>
                        <div>
                          <p className="text-sm font-semibold">Payment Status</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {[
                              ["PENDING", "Payment pending"],
                              ["SUCCESS", "Payment received"],
                            ].map(([value, label]) => (
                              <label
                                key={value}
                                className={`rounded-lg border px-3 py-2 text-sm ${
                                  paymentStatus === value
                                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                    : "border-[var(--border)] bg-[var(--bg-panel)]"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="payment-status"
                                  value={value}
                                  checked={paymentStatus === value}
                                  onChange={() =>
                                    setPaymentStatus(
                                      value as DealerAnalyticsPaymentStatus
                                    )
                                  }
                                  className="mr-2"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={
                            !pricingQuery.data ||
                            pricingState !== "CALCULATED" ||
                            storeMutation.isPending ||
                            pricingQuery.isFetching
                          }
                          onClick={() => storeMutation.mutate()}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {storeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Store
                        </button>
                      </div>
                      {storeError != null && (
                        <div className="mt-4">
                          <ErrorBox
                            error={storeError}
                            fallback="Something went wrong while processing this request. Please try again."
                          />
                        </div>
                      )}
                    </div>

                    <PricingPreview
                      pricing={pricingQuery.data ?? null}
                      state={pricingState}
                      error={pricingQuery.error}
                      onRetry={() => pricingQuery.refetch()}
                    />
                  </>
                )}

                {paymentError != null && (
                  <ErrorBox
                    error={paymentError}
                    fallback="Unable to mark payment as completed."
                  />
                )}
              </>
            )}
          </section>
        </div>
      ) : (
        <section className="space-y-4">
          {analyticsQuery.isLoading && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Loading analytics snapshots...
            </div>
          )}
          {analyticsQuery.error && (
            <ErrorBox
              error={analyticsQuery.error}
              fallback="Failed to load analytics records."
              onRetry={() => analyticsQuery.refetch()}
            />
          )}
          {!analyticsQuery.isLoading &&
            analyticsRecords.length === 0 &&
            !analyticsQuery.error && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
                No analytics snapshots have been stored yet.
              </div>
            )}
          {analyticsRecords.map((record) => (
            <div
              key={record.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    <h2 className="font-semibold">{record.orderId}</h2>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Stored {formatDate(record.createdAt)} / Updated{" "}
                    {formatDate(record.updatedAt)}
                  </p>
                </div>
                <Badge value={record.paymentStatus} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Stat
                  label="Dealer Cost"
                  value={formatMoney(record.totalDealerCost)}
                />
                <Stat
                  label="Original Total"
                  value={formatMoney(record.originalCustomerTotal)}
                />
                <Stat
                  label="Final Total"
                  value={formatMoney(record.finalCustomerTotal)}
                  strong
                />
                <Stat
                  label="Dealer Profit"
                  value={formatMoney(record.dealerProfit)}
                  strong
                  tone={record.dealerProfit < 0 ? "negative" : "default"}
                />
                <Stat
                  label="Discount"
                  value={`${record.discountPercent}% / ${formatMoney(
                    record.discountAmount
                  )}`}
                />
                <Stat label="Order State" value={record.orderState} />
                <Stat label="Payment Method" value={record.paymentMethod} />
                <Stat label="Channel" value={record.pricingChannelId} />
              </div>
              {record.paymentStatus === "PENDING" && (
                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    disabled={paymentDoneMutation.isPending}
                    onClick={() => handlePaymentDone(record.orderId)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CreditCard className="h-4 w-4" />
                    Mark Payment Done
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
