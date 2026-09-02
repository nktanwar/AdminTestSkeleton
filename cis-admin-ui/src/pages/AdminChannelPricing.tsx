import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { ChannelAPI } from "../lib/api"
import {
  CISAPI,
  type AdminChannelProductPricingPayload,
  type AdminChannelOptionPricingPayload,
  type PricingType,
} from "../lib/cisApi"
import {
  ProductAPI,
  type DealerProduct,
  type ProductConfigurationOption,
  type ProductConfigurationQuestion,
} from "../lib/productApi"
import { toUserFacingErrorMessage } from "../lib/errors"

type BaseDraft = {
  dealerPrice: string
  customerPrice: string
}

type OptionDraft = {
  pricingType: PricingType
  dealerPrice: string
  customerPrice: string
  dealerRate: string
  customerRate: string
}

type OptionDraftMap = Record<string, OptionDraft>

type AdminChannelPricingRow = DealerProduct & {
  imageUrl?: string
  dealerPrice?: number
  customerPrice?: number
  pricingConfigured: boolean
}

type ProductConfigurationQuestionWithFallbacks = ProductConfigurationQuestion & {
  id?: string
  options: ProductConfigurationOptionWithFallbacks[]
}

type ProductConfigurationOptionWithFallbacks = ProductConfigurationOption & {
  id?: string
  label?: string
}

function formatCurrency(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function toInputValue(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : ""
}

function buildOptionKey(questionId: string, optionId: string): string {
  return `${questionId}::${optionId}`
}

function getQuestionId(
  question: ProductConfigurationQuestionWithFallbacks
): string {
  return question.questionId || question.id || ""
}

function getQuestionText(
  question: ProductConfigurationQuestionWithFallbacks
): string {
  return question.questionText || getQuestionId(question)
}

function getOptionId(option: ProductConfigurationOptionWithFallbacks): string {
  return option.optionId || option.id || ""
}

function getOptionLabel(
  option: ProductConfigurationOptionWithFallbacks
): string {
  return option.optionLabel || option.label || getOptionId(option)
}

function Field({
  label,
  value,
  onChange,
  type = "number",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type={type}
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
      />
    </label>
  )
}

function OptionRow({
  questionId,
  questionText,
  optionId,
  optionLabel,
  draft,
  onChange,
  onSave,
  saving,
}: {
  questionId: string
  questionText: string
  optionId: string
  optionLabel: string
  draft: OptionDraft
  onChange: (next: OptionDraft) => void
  onSave: () => void
  saving: boolean
}) {
  const showFixed = draft.pricingType === "FIXED"
  const showRate =
    draft.pricingType === "PER_UNIT" || draft.pricingType === "AREA"

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{optionLabel}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Question: {questionText}
          </p>
        </div>
        <select
          value={draft.pricingType}
          onChange={(event) =>
            onChange({
              ...draft,
              pricingType: event.target.value as PricingType,
            })
          }
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm"
        >
          <option value="FIXED">FIXED</option>
          <option value="PER_UNIT">PER_UNIT</option>
          <option value="AREA">AREA</option>
        </select>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {showFixed && (
          <>
            <Field
              label="Dealer Price"
              value={draft.dealerPrice}
              onChange={(value) => onChange({ ...draft, dealerPrice: value })}
            />
            <Field
              label="Customer Price"
              value={draft.customerPrice}
              onChange={(value) =>
                onChange({ ...draft, customerPrice: value })
              }
            />
          </>
        )}

        {showRate && (
          <>
            <Field
              label="Dealer Rate"
              value={draft.dealerRate}
              onChange={(value) => onChange({ ...draft, dealerRate: value })}
            />
            <Field
              label="Customer Rate"
              value={draft.customerRate}
              onChange={(value) =>
                onChange({ ...draft, customerRate: value })
              }
            />
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-xs text-[var(--text-muted)]">
          {questionId} / {optionId}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}

export default function AdminChannelPricing() {
  const { channelId } = useParams<{ channelId: string }>()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] =
    useState<AdminChannelPricingRow | null>(null)
  const [baseDraft, setBaseDraft] = useState<BaseDraft>({
    dealerPrice: "",
    customerPrice: "",
  })
  const [optionDrafts, setOptionDrafts] = useState<OptionDraftMap>({})

  const channelQuery = useQuery({
    queryKey: ["admin-channel", channelId],
    queryFn: () => ChannelAPI.get(channelId!),
    enabled: Boolean(channelId),
  })

  const productsQuery = useQuery({
    queryKey: ["admin-channel-pricing-products"],
    queryFn: ProductAPI.listDealerProducts,
    enabled: Boolean(channelId),
  })

  const productPricingQuery = useQuery({
    queryKey: ["admin-channel-product-pricing", channelId],
    queryFn: () => CISAPI.listProductPricing(channelId!),
    enabled: Boolean(channelId),
  })

  const productConfigQuery = useQuery({
    queryKey: [
      "admin-channel-product-configuration",
      channelId,
      selectedProduct?.productId,
      selectedProduct?.configurationId,
    ],
    queryFn: () =>
      ProductAPI.getConfiguration(
        selectedProduct?.productId ?? "",
        selectedProduct?.configurationId ?? ""
      ),
    enabled: Boolean(
      channelId &&
        selectedProduct?.isConfigurable &&
        selectedProduct?.configurationId
    ),
  })

  const optionPricingQuery = useQuery({
    queryKey: [
      "admin-channel-option-pricing",
      channelId,
      selectedProduct?.productId,
      selectedProduct?.configurationId,
    ],
    queryFn: () =>
      CISAPI.listOptionPricing(
        channelId!,
        selectedProduct?.productId ?? "",
        selectedProduct?.configurationId ?? ""
      ),
    enabled: Boolean(
      channelId &&
        selectedProduct?.isConfigurable &&
        selectedProduct?.configurationId
    ),
  })

  const updateProductPricingMutation = useMutation({
    mutationFn: ({
      channelId: currentChannelId,
      payload,
    }: {
      channelId: string
      payload: AdminChannelProductPricingPayload
    }) => CISAPI.updateProductPricing(currentChannelId, payload),
    onSuccess: async () => {
      setMessage("Pricing Updated Successfully")
      await queryClient.invalidateQueries({
        queryKey: ["admin-channel-product-pricing", channelId],
      })
    },
  })

  const updateOptionPricingMutation = useMutation({
    mutationFn: ({
      channelId: currentChannelId,
      payload,
    }: {
      channelId: string
      payload: AdminChannelOptionPricingPayload
    }) => CISAPI.updateOptionPricing(currentChannelId, payload),
    onSuccess: async () => {
      setMessage("Pricing Updated Successfully")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-channel-product-pricing", channelId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "admin-channel-option-pricing",
            channelId,
            selectedProduct?.productId,
            selectedProduct?.configurationId,
          ],
        }),
      ])
    },
  })

  const loadedOptionDrafts = useMemo<OptionDraftMap>(() => {
    if (!productConfigQuery.data || !optionPricingQuery.data) return {}

    const byOptionKey = new Map(
      optionPricingQuery.data.map((row) => [
        buildOptionKey(row.questionId, row.optionId),
        row,
      ])
    )

    const nextDrafts: OptionDraftMap = {}

    productConfigQuery.data.questions.forEach((question) => {
      const normalizedQuestion =
        question as ProductConfigurationQuestionWithFallbacks
      const questionId = getQuestionId(normalizedQuestion)
      if (!questionId) return

      question.options.forEach((option) => {
        const optionId = getOptionId(option)
        if (!optionId) return

        const existing = byOptionKey.get(
          buildOptionKey(questionId, optionId)
        )

        nextDrafts[buildOptionKey(questionId, optionId)] = {
          pricingType: existing?.pricingType ?? "FIXED",
          dealerPrice: toInputValue(existing?.dealerPrice),
          customerPrice: toInputValue(existing?.customerPrice),
          dealerRate: toInputValue(existing?.dealerRate),
          customerRate: toInputValue(existing?.customerRate),
        }
      })
    })

    return nextDrafts
  }, [productConfigQuery.data, optionPricingQuery.data])

  const pricingRows = useMemo<AdminChannelPricingRow[]>(() => {
    const pricingMap = new Map(
      (productPricingQuery.data ?? []).map((pricing) => [
        pricing.productId,
        pricing,
      ])
    )

    return (productsQuery.data ?? []).map((product) => {
      const pricing = pricingMap.get(product.productId)

      return {
        ...product,
        imageUrl: product.imageUrls?.[0],
        dealerPrice: pricing?.dealerPrice,
        customerPrice: pricing?.customerPrice,
        pricingConfigured: pricing != null,
      }
    })
  }, [productPricingQuery.data, productsQuery.data])

  const filteredRows = useMemo(() => {
    const list = pricingRows
    const term = search.trim().toLowerCase()
    if (!term) return list

    return list.filter((item) =>
      [item.name, item.sku, item.productId]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [pricingRows, search])

  function openProduct(product: AdminChannelPricingRow) {
    setSelectedProduct(product)
    setBaseDraft({
      dealerPrice: toInputValue(product.dealerPrice),
      customerPrice: toInputValue(product.customerPrice),
    })
    setOptionDrafts({})
    setMessage(null)
  }

  function closeModal() {
    setSelectedProduct(null)
    setOptionDrafts({})
  }

  async function saveBasePricing() {
    if (!channelId || !selectedProduct) return

    const dealerPrice = toNumber(baseDraft.dealerPrice)
    const customerPrice = toNumber(baseDraft.customerPrice)

    if (dealerPrice == null || customerPrice == null) {
      setMessage("Dealer price and customer price are required.")
      return
    }

    await updateProductPricingMutation.mutateAsync({
      channelId,
      payload: {
        productId: selectedProduct.productId,
        dealerPrice,
        customerPrice,
      },
    })
  }

  async function saveOptionPricing(questionId: string, optionId: string) {
    if (!channelId || !selectedProduct || !productConfigQuery.data) return
    if (!questionId || !optionId) {
      setMessage("Question ID and option ID are required.")
      return
    }

    const draft =
      optionDrafts[buildOptionKey(questionId, optionId)] ??
      loadedOptionDrafts[buildOptionKey(questionId, optionId)]
    if (!draft) return

    const configurationVersion =
      optionPricingQuery.data?.[0]?.configurationVersion ??
      productConfigQuery.data.version

    const basePayload = {
      productId: selectedProduct.productId,
      configurationId: selectedProduct.configurationId ?? "",
      configurationVersion,
      questionId,
      optionId,
      pricingType: draft.pricingType,
    }

    let payload: AdminChannelOptionPricingPayload

    if (draft.pricingType === "FIXED") {
      const dealerPrice = toNumber(draft.dealerPrice)
      const customerPrice = toNumber(draft.customerPrice)
      if (dealerPrice == null || customerPrice == null) {
        setMessage("Fixed pricing requires dealer and customer prices.")
        return
      }
      payload = {
        ...basePayload,
        dealerPrice,
        customerPrice,
      }
    } else {
      const dealerRate = toNumber(draft.dealerRate)
      const customerRate = toNumber(draft.customerRate)
      if (dealerRate == null || customerRate == null) {
        setMessage("Rate pricing requires dealer and customer rates.")
        return
      }
      payload = {
        ...basePayload,
        dealerRate,
        customerRate,
      }
    }

    await updateOptionPricingMutation.mutateAsync({
      channelId,
      payload,
    })
  }

  if (
    channelQuery.isLoading ||
    productsQuery.isLoading ||
    productPricingQuery.isLoading
  ) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading channel pricing...
      </div>
    )
  }

  if (channelQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {channelQuery.error instanceof Error
          ? toUserFacingErrorMessage(channelQuery.error)
          : "Failed to load channel."}
      </div>
    )
  }

  if (productsQuery.error || productPricingQuery.error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {productsQuery.error instanceof Error
          ? toUserFacingErrorMessage(productsQuery.error)
          : productPricingQuery.error instanceof Error
            ? toUserFacingErrorMessage(productPricingQuery.error)
            : "Failed to load products or pricing."}
      </div>
    )
  }

  const channel = channelQuery.data
  const selectedConfigurationVersion =
    optionPricingQuery.data?.[0]?.configurationVersion ??
    productConfigQuery.data?.version ??
    null

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,20,27,0.96))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--text-soft)]">
              CHANNEL PRICING
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {channel?.name ?? "Channel Pricing"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-soft)]">
              Configure base product prices and option pricing for this channel.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[var(--text-soft)]">
            Channel ID: {channelId}
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Product Table</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Search products and open pricing controls for a specific item.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] lg:max-w-sm"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[var(--bg-panel)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Image</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">SKU</th>
                <th className="px-4 py-3 text-left font-medium">Dealer Price</th>
                <th className="px-4 py-3 text-left font-medium">Customer Price</th>
                <th className="px-4 py-3 text-left font-medium">Margin</th>
                <th className="px-4 py-3 text-left font-medium">Configured</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((product) => {
                const margin =
                  typeof product.customerPrice === "number" &&
                  typeof product.dealerPrice === "number"
                    ? product.customerPrice - product.dealerPrice
                    : undefined
                const hasPricingConfigured =
                  typeof product.dealerPrice === "number" &&
                  typeof product.customerPrice === "number"

                return (
                  <tr
                    key={product.productId}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-14 w-14 rounded-lg border border-[var(--border)] object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] text-[10px] text-[var(--text-muted)]">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {product.productId}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3">
                      {hasPricingConfigured
                        ? formatCurrency(product.dealerPrice)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {hasPricingConfigured
                        ? formatCurrency(product.customerPrice)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {hasPricingConfigured
                        ? formatCurrency(margin)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          product.pricingConfigured
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200",
                        ].join(" ")}
                      >
                        {product.pricingConfigured
                          ? "Configured"
                          : "Not Configured"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openProduct(product)}
                        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-[var(--text-muted)]"
                  >
                    No products match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-panel)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Product Pricing Modal
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {selectedProduct.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  SKU {selectedProduct.sku}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 p-5">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Base Product Pricing
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Dealer Price and Customer Price are saved to CIS.
                    </p>
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Pricing Configured:{" "}
                    {selectedProduct.pricingConfigured ? "Yes" : "No"}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Dealer Price"
                    value={baseDraft.dealerPrice}
                    onChange={(value) =>
                      setBaseDraft((current) => ({
                        ...current,
                        dealerPrice: value,
                      }))
                    }
                  />
                  <Field
                    label="Customer Price"
                    value={baseDraft.customerPrice}
                    onChange={(value) =>
                      setBaseDraft((current) => ({
                        ...current,
                        customerPrice: value,
                      }))
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">
                    Margin is derived from the entered values.
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveBasePricing()}
                    disabled={updateProductPricingMutation.isPending}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updateProductPricingMutation.isPending
                      ? "Saving..."
                      : "Save"}
                  </button>
                </div>
              </section>

              {selectedProduct.isConfigurable &&
                selectedProduct.configurationId && (
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-5">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold">
                        Configure Options
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        Configuration version {selectedConfigurationVersion ?? "-"}
                      </p>
                    </div>

                    {productConfigQuery.isLoading ||
                    optionPricingQuery.isLoading ? (
                      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
                        Loading option pricing...
                      </div>
                    ) : productConfigQuery.error || optionPricingQuery.error ? (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                        {productConfigQuery.error instanceof Error
                          ? toUserFacingErrorMessage(productConfigQuery.error)
                          : optionPricingQuery.error instanceof Error
                            ? toUserFacingErrorMessage(optionPricingQuery.error)
                            : "Failed to load option pricing."}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-5">
                        {productConfigQuery.data?.questions.map((question) => {
                          const normalizedQuestion =
                            question as ProductConfigurationQuestionWithFallbacks
                          const questionId = getQuestionId(normalizedQuestion)
                          const questionText =
                            getQuestionText(normalizedQuestion)

                          return (
                            <div
                              key={questionId || question.questionText}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
                            >
                              <div>
                                <h4 className="text-base font-semibold">
                                  {questionText}
                                </h4>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                  {question.questionType}
                                </p>
                              </div>

                              <div className="mt-4 space-y-3">
                                {normalizedQuestion.options.map((option) => {
                                  const optionId = getOptionId(option)
                                  const draftKey = buildOptionKey(
                                    questionId,
                                    optionId
                                  )
                                  const optionDraft =
                                    optionDrafts[draftKey] ??
                                    loadedOptionDrafts[draftKey] ?? {
                                      pricingType: "FIXED",
                                      dealerPrice: "",
                                      customerPrice: "",
                                      dealerRate: "",
                                      customerRate: "",
                                    }

                                  return (
                                    <OptionRow
                                      key={draftKey}
                                      questionId={questionId}
                                      questionText={questionText}
                                      optionId={optionId}
                                      optionLabel={getOptionLabel(option)}
                                      draft={optionDraft}
                                      onChange={(next) =>
                                        setOptionDrafts((current) => ({
                                          ...current,
                                          [draftKey]: next,
                                        }))
                                      }
                                      onSave={() =>
                                        void saveOptionPricing(
                                          questionId,
                                          optionId
                                        )
                                      }
                                      saving={
                                        updateOptionPricingMutation.isPending
                                      }
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
