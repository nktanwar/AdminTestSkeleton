import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Check,
  Loader2,
  PackagePlus,
  Settings2,
  Trash2,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Minus,
  X,
  HelpCircle,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import {
  DealerAPI,
  type ChannelPricingOptionResponse,
  type ChannelProductConfigurationPricingResponse,
  type DealerCheckoutAnswerRequest,
  type DealerCheckoutItemRequest,
  type DealerCheckoutRequest,
  type DealerCheckoutResponse,
} from "../lib/api"
import {
  ProductAPI,
  type DealerProductSummary,
  type DealerProduct,
} from "../lib/productApi"
import { toUserFacingErrorMessage } from "../lib/errors"

const SELECTED_CHANNEL_STORAGE_KEY = "selectedChannelId"

interface QuoteLine {
  id: string
  productName: string
  sku: string
  request: DealerCheckoutItemRequest
}

interface ConfigDraft {
  quantity: number
  answers: Record<
    string,
    {
      optionId: string
      pricingType: ChannelPricingOptionResponse["pricingType"]
      value?: number
      length?: number
      width?: number
    }
  >
}

function formatMoney(value: number | undefined): string {
  if (typeof value !== "number") return "-"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function buildCheckoutAnswer(
  questionId: string,
  answer: ConfigDraft["answers"][string]
): DealerCheckoutAnswerRequest {
  if (answer.pricingType === "PER_UNIT") {
    return {
      questionId,
      optionId: answer.optionId,
      value: answer.value ?? 0,
    }
  }

  if (answer.pricingType === "AREA") {
    return {
      questionId,
      optionId: answer.optionId,
      areaValue: {
        length: answer.length ?? 0,
        width: answer.width ?? 0,
      },
    }
  }

  return {
    questionId,
    optionId: answer.optionId,
  }
}

// Helper Components
function OptionPrice({
  option,
  showCustomer,
}: {
  option: ChannelPricingOptionResponse
  showCustomer: boolean
}) {
  if (option.pricingType === "FIXED") {
    return (
      <div className="flex gap-2 text-xs">
        {!showCustomer && (
          <span className="text-[var(--text-muted)]">
            D: <span className="font-bold text-[var(--text-primary)]">+{formatMoney(option.dealerPrice)}</span>
          </span>
        )}
        <span className="text-[var(--text-muted)]">
          C: <span className="font-bold text-[var(--accent)]">+{formatMoney(option.customerPrice)}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex gap-2 text-xs">
      {!showCustomer && (
        <span className="text-[var(--text-muted)]">
          D: <span className="font-bold text-[var(--text-primary)]">+{formatMoney(option.dealerRate)}/sqft</span>
        </span>
      )}
      <span className="text-[var(--text-muted)]">
        C: <span className="font-bold text-[var(--accent)]">+{formatMoney(option.customerRate)}/sqft</span>
      </span>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="mt-2 block text-xs font-semibold">
      <span className="text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none font-mono"
      />
    </label>
  )
}

function SummaryRow({
  label,
  value,
  accentColor,
  highlight,
}: {
  label: string
  value: string
  accentColor?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-1 ${
        highlight
          ? "border-t border-[var(--border)] pt-2 text-sm font-bold mt-1 text-[var(--accent)]"
          : ""
      }`}
    >
      <span className={highlight ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
        {label}
      </span>
      <span className={accentColor ? accentColor : highlight ? "text-[var(--accent)]" : "font-semibold"}>
        {value}
      </span>
    </div>
  )
}

function ContentSectionRenderer({ section }: { section: any }) {
  if (!section.enabled) return null
  const items = section.items ?? []

  switch (section.type) {
    case "HERO_BANNER":
      return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-[var(--border)] p-6 text-center space-y-4 my-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--accent-soft)] via-transparent to-transparent opacity-40"></div>
          {section.title && <h3 className="text-lg font-bold relative z-10">{section.title}</h3>}
          {section.subtitle && <p className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-semibold relative z-10">{section.subtitle}</p>}
          {section.description && <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto relative z-10">{section.description}</p>}
          {items.map((item: any, i: number) => (
            <div key={i} className="relative z-10 pt-2">
              {item.imageUrl && <img src={item.imageUrl} alt="" className="mx-auto max-h-40 rounded object-contain mb-2" />}
              {item.buttonText && (
                <button type="button" className="rounded bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent-strong)] transition">
                  {item.buttonText}
                </button>
              )}
            </div>
          ))}
        </div>
      )
    case "IMAGE_TEXT":
    case "IMAGE_TEXT_REVERSE":
      const isReverse = section.type === "IMAGE_TEXT_REVERSE"
      return (
        <div className="grid gap-4 md:grid-cols-2 items-center my-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)]">
          <div className={isReverse ? "md:order-2" : ""}>
            {items[0]?.imageUrl ? (
              <img src={items[0].imageUrl} alt="" className="rounded max-h-48 w-full object-cover border border-[var(--border)]" />
            ) : (
              <div className="h-32 rounded bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-muted)]">No image</div>
            )}
          </div>
          <div className="space-y-2">
            {section.title && <h3 className="text-sm font-bold">{section.title}</h3>}
            {section.subtitle && <p className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-semibold">{section.subtitle}</p>}
            {section.description && <p className="text-xs text-[var(--text-muted)] leading-relaxed">{section.description}</p>}
            {items[0]?.buttonText && (
              <button type="button" className="rounded bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent-strong)] transition">
                {items[0].buttonText}
              </button>
            )}
          </div>
        </div>
      )
    case "HIGHLIGHTS_GRID":
    case "FEATURE_GRID":
      return (
        <div className="space-y-3 my-4">
          {(section.title || section.subtitle) && (
            <div className="text-center">
              {section.subtitle && <span className="text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider">{section.subtitle}</span>}
              {section.title && <h3 className="text-sm font-bold mt-0.5">{section.title}</h3>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] space-y-1">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain rounded" />}
                {item.title && <h4 className="text-xs font-semibold">{item.title}</h4>}
                {item.description && <p className="text-[10px] text-[var(--text-muted)]">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return null
  }
}

// Major Components
function ProductCard({
  product,
  onAdd,
  onConfigure,
  onViewDetails,
  showCustomer,
}: {
  product: DealerProductSummary & {
    dealerPrice?: number
    customerPrice?: number
    margin?: number
    marginPercent?: number
  }
  onAdd: (product: any) => void
  onConfigure: (product: any) => void
  onViewDetails: (productId: string) => void
  showCustomer: boolean
}) {
  const hasPricing =
    typeof product.customerPrice === "number" &&
    (showCustomer || typeof product.dealerPrice === "number")
  const hasConfiguration = product.isConfigurable && Boolean(product.configurationId)
  const actionDisabled =
    !product.isAvailable || !hasPricing || (product.isConfigurable && !hasConfiguration)

  return (
    <article className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition-all duration-300 hover:border-zinc-700 hover:shadow-xl flex flex-col h-full">
      <div
        onClick={() => onViewDetails(product.productId)}
        className="aspect-[4/3] overflow-hidden border-b border-[var(--border)] relative cursor-pointer"
      >
        {product.imageUrls?.[0] ? (
          <img
            src={product.imageUrls[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--bg-panel)] text-xs text-[var(--text-muted)]">
            No image
          </div>
        )}
        {product.isConfigurable && (
          <span className="absolute top-3 right-3 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] border border-[var(--accent)]/20 backdrop-blur-sm">
            Configurable
          </span>
        )}
      </div>

      <div className="space-y-4 p-5 flex flex-col flex-grow justify-between">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h2
              onClick={() => onViewDetails(product.productId)}
              className="text-base font-bold leading-tight cursor-pointer hover:text-[var(--accent)] transition"
            >
              {product.name}
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                product.isAvailable
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {product.isAvailable ? "Available" : "Out of stock"}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            SKU: {product.sku}
          </p>
        </div>

        <div className={`grid gap-2 text-xs ${showCustomer ? "grid-cols-1" : "grid-cols-2"}`}>
          {!showCustomer && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Dealer Price
              </div>
              <div className="mt-0.5 font-bold text-[var(--text-primary)]">
                {hasPricing ? formatMoney(product.dealerPrice) : "-"}
              </div>
            </div>
          )}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Customer Price
            </div>
            <div className="mt-0.5 font-bold text-[var(--text-primary)]">
              {hasPricing ? formatMoney(product.customerPrice) : "Not Configured"}
            </div>
          </div>
          {!showCustomer && (
            <>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Margin
                </div>
                <div className="mt-0.5 font-bold text-emerald-400">
                  {hasPricing ? formatMoney(product.margin) : "-"}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Margin %
                </div>
                <div className="mt-0.5 font-bold text-emerald-400">
                  {typeof product.marginPercent === "number"
                    ? `${product.marginPercent.toFixed(1)}%`
                    : "-"}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => onViewDetails(product.productId)}
            className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]/30 transition text-center"
          >
            Details
          </button>
          <button
            type="button"
            disabled={actionDisabled}
            onClick={() =>
              hasConfiguration ? onConfigure(product) : onAdd(product)
            }
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasConfiguration ? (
              <Settings2 className="h-3.5 w-3.5" />
            ) : (
              <PackagePlus className="h-3.5 w-3.5" />
            )}
            {product.isConfigurable && !hasConfiguration
              ? "Missing Config"
              : hasConfiguration
                ? "Configure"
                : "Add to Quote"}
          </button>
        </div>
      </div>
    </article>
  )
}

function ConfigurationPanel({
  product,
  config,
  draft,
  loading,
  error,
  showCustomer,
  onDraftChange,
  onAdd,
  onClose,
}: {
  product: DealerProductSummary
  config?: ChannelProductConfigurationPricingResponse
  draft: ConfigDraft
  loading: boolean
  error: unknown
  showCustomer: boolean
  onDraftChange: (draft: ConfigDraft) => void
  onAdd: () => void
  onClose: () => void
}) {
  return (
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] space-y-4 animate-in slide-in-from-right duration-200">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-bold">
            Configure Product
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
            {product.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[var(--text-muted)]">Quantity</span>
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] overflow-hidden">
          <button
            type="button"
            onClick={() =>
              onDraftChange({
                ...draft,
                quantity: Math.max(1, draft.quantity - 1),
              })
            }
            className="px-3 py-1.5 hover:bg-zinc-800 transition text-[var(--text-muted)]"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="px-4 py-1.5 text-sm font-bold w-12 text-center text-[var(--text-primary)]">
            {draft.quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              onDraftChange({
                ...draft,
                quantity: draft.quantity + 1,
              })
            }
            className="px-3 py-1.5 hover:bg-zinc-800 transition text-[var(--text-muted)]"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          <span>Loading configuration rules...</span>
        </div>
      )}

      {Boolean(error) && (
        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error instanceof Error
            ? toUserFacingErrorMessage(error)
            : "Failed to load configuration pricing."}
        </div>
      )}

      {config && (
        <div className="space-y-4">
          {config.questions.map((question) => (
            <div
              key={question.questionId}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-4 space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {question.questionText}
              </h3>
              <div className="grid gap-2">
                {question.options.map((option) => {
                  const selected =
                    draft.answers[question.questionId]?.optionId === option.optionId

                  return (
                    <div
                      key={option.optionId}
                      className={`rounded-lg border p-3 transition-all duration-200 cursor-pointer ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] bg-[var(--bg-card)] hover:border-zinc-700"
                      }`}
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          answers: {
                            ...draft.answers,
                            [question.questionId]: {
                              optionId: option.optionId,
                              pricingType: option.pricingType,
                              value: option.pricingType === "PER_UNIT" ? 1 : undefined,
                              length: option.pricingType === "AREA" ? 1 : undefined,
                              width: option.pricingType === "AREA" ? 1 : undefined,
                            },
                          },
                        })
                      }
                    >
                      <div className="flex w-full items-center justify-between gap-3 text-left">
                        <span className="font-semibold text-sm">{option.optionLabel}</span>
                        <div className="flex items-center gap-2">
                          <OptionPrice
                            option={option}
                            showCustomer={showCustomer}
                          />
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              selected
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                : "border-zinc-600"
                            }`}
                          >
                            {selected && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>
                      </div>

                      {selected && option.pricingType === "PER_UNIT" && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <NumberField
                            label="Quantity Value"
                            value={draft.answers[question.questionId]?.value ?? 1}
                            onChange={(val) =>
                              onDraftChange({
                                ...draft,
                                answers: {
                                  ...draft.answers,
                                  [question.questionId]: {
                                    ...draft.answers[question.questionId],
                                    value: val,
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      )}

                      {selected && option.pricingType === "AREA" && (
                        <div
                          className="mt-3 grid gap-3 sm:grid-cols-3 border-t border-[var(--border)] pt-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <NumberField
                            label="Length (ft)"
                            value={draft.answers[question.questionId]?.length ?? 1}
                            onChange={(val) =>
                              onDraftChange({
                                ...draft,
                                answers: {
                                  ...draft.answers,
                                  [question.questionId]: {
                                    ...draft.answers[question.questionId],
                                    length: val,
                                  },
                                },
                              })
                            }
                          />
                          <NumberField
                            label="Width (ft)"
                            value={draft.answers[question.questionId]?.width ?? 1}
                            onChange={(val) =>
                              onDraftChange({
                                ...draft,
                                answers: {
                                  ...draft.answers,
                                  [question.questionId]: {
                                    ...draft.answers[question.questionId],
                                    width: val,
                                  },
                                },
                              })
                            }
                          />
                          <div className="text-xs">
                            <div className="font-bold text-[var(--text-muted)] uppercase tracking-wider">
                              Area (sq ft)
                            </div>
                            <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 font-mono font-bold">
                              {(
                                (draft.answers[question.questionId]?.length ?? 0) *
                                (draft.answers[question.questionId]?.width ?? 0)
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] transition shadow-md"
          >
            <PackagePlus className="h-4 w-4" />
            Add Configuration to Quote
          </button>
        </div>
      )}
    </aside>
  )
}

function ProductDetailPanel({
  product,
  onClose,
  onAdd,
  onConfigure,
  showCustomer,
}: {
  product: DealerProduct & {
    dealerPrice?: number
    customerPrice?: number
    margin?: number
    marginPercent?: number
  }
  onClose: () => void
  onAdd: (product: any) => void
  onConfigure: (product: any) => void
  showCustomer: boolean
}) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    if (product.color && product.color.length > 0) {
      setSelectedColor(product.color[0])
    } else {
      setSelectedColor(null)
    }
  }, [product])

  const galleryImages = useMemo(() => {
    if (selectedColor && product.colorImageMap?.[selectedColor]) {
      return product.colorImageMap[selectedColor]
    }
    return product.imageUrls ?? []
  }, [product, selectedColor])

  useEffect(() => {
    if (galleryImages.length > 0) {
      setSelectedImage(galleryImages[0])
    } else {
      setSelectedImage(null)
    }
  }, [galleryImages])

  const hasPricing =
    typeof product.customerPrice === "number" &&
    (showCustomer || typeof product.dealerPrice === "number")
  const hasConfiguration = product.isConfigurable && Boolean(product.configurationId)

  return (
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] space-y-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-right duration-200">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-bold">
            Product details
          </span>
          <h2 className="mt-1 text-xl font-bold leading-tight">{product.name}</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            SKU: {product.sku}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-center">
          {selectedImage ? (
            <img src={selectedImage} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No image available</span>
          )}
        </div>
        {galleryImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {galleryImages.map((imgUrl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedImage(imgUrl)}
                className={`h-12 w-12 rounded border overflow-hidden shrink-0 transition ${
                  selectedImage === imgUrl
                    ? "border-[var(--accent)] scale-95"
                    : "border-[var(--border)] hover:border-zinc-500"
                }`}
              >
                <img src={imgUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {product.color && product.color.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Select Color
          </span>
          <div className="flex gap-2">
            {product.color.map((colorName) => (
              <button
                key={colorName}
                type="button"
                onClick={() => setSelectedColor(colorName)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  selectedColor === colorName
                    ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
                    : "bg-[var(--bg-panel)] border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {colorName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Pricing Summary
        </h4>
        <div className={`grid gap-3 ${showCustomer ? "grid-cols-1" : "grid-cols-2"}`}>
          {!showCustomer && (
            <div className="p-2 border border-[var(--border)] bg-[var(--bg-card)] rounded-lg">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                Dealer Cost
              </span>
              <div className="font-bold text-sm mt-0.5">
                {hasPricing ? formatMoney(product.dealerPrice) : "-"}
              </div>
            </div>
          )}
          <div className="p-2 border border-[var(--border)] bg-[var(--bg-card)] rounded-lg">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
              Customer Price
            </span>
            <div className="font-bold text-sm mt-0.5 text-[var(--accent)]">
              {hasPricing ? formatMoney(product.customerPrice) : "Not Configured"}
            </div>
          </div>
          {!showCustomer && (
            <>
              <div className="p-2 border border-[var(--border)] bg-[var(--bg-card)] rounded-lg">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                  Dealer Margin
                </span>
                <div className="font-bold text-sm mt-0.5 text-emerald-400">
                  {hasPricing ? formatMoney(product.margin) : "-"}
                </div>
              </div>
              <div className="p-2 border border-[var(--border)] bg-[var(--bg-card)] rounded-lg">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                  Margin %
                </span>
                <div className="font-bold text-sm mt-0.5 text-emerald-400">
                  {typeof product.marginPercent === "number"
                    ? `${product.marginPercent.toFixed(1)}%`
                    : "-"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {product.description && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Description
          </h4>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border)]">
            {product.description}
          </p>
        </div>
      )}

      {product.productSpecification && product.productSpecification.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Specifications
          </h4>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-panel)]">
            <table className="w-full text-left border-collapse text-xs">
              <tbody>
                {product.productSpecification.map((spec, i) =>
                  Object.entries(spec).map(([key, val]) => (
                    <tr
                      key={`${key}-${i}`}
                      className="border-t border-[var(--border)] first:border-0 hover:bg-zinc-800/10"
                    >
                      <td className="px-3 py-2 font-semibold text-[var(--text-muted)] bg-[var(--bg-card)] w-1/3">
                        {key}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">{val}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {product.faq && product.faq.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            FAQ
          </h4>
          <div className="space-y-2">
            {product.faq.map((faqItem, i) => (
              <details
                key={i}
                className="group rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-3 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <span>{faqItem.question}</span>
                  <span className="shrink-0 rounded-full bg-[var(--accent-soft)] p-0.5 text-[var(--accent)] group-open:rotate-180 transition-transform duration-200">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)] border-t border-[var(--border)] pt-2">
                  {faqItem.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {product.contentSections && product.contentSections.length > 0 && (
        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            Features & Gallery
          </h4>
          <div className="divide-y divide-[var(--border)]">
            {product.contentSections.map((sec) => (
              <ContentSectionRenderer key={sec.id} section={sec} />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onClose()
          if (hasConfiguration) {
            onConfigure(product)
          } else {
            onAdd(product)
          }
        }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
      >
        {hasConfiguration ? (
          <>
            <Settings2 className="h-4 w-4" />
            Configure Product
          </>
        ) : (
          <>
            <PackagePlus className="h-4 w-4" />
            Add to Quote
          </>
        )}
      </button>
    </aside>
  )
}

function QuoteSummary({
  lines,
  checkout,
  calculating,
  discountPercent,
  showCustomer,
  onDiscountChange,
  onRemove,
  onUpdateQty,
}: {
  lines: QuoteLine[]
  checkout: DealerCheckoutResponse | null
  calculating: boolean
  discountPercent: number
  showCustomer: boolean
  onDiscountChange: (value: number) => void
  onRemove: (id: string) => void
  onUpdateQty: (id: string, qty: number) => void
}) {
  return (
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] space-y-4 animate-in slide-in-from-bottom duration-200">
      <div className="border-b border-[var(--border)] pb-3">
        <h2 className="text-lg font-bold flex items-center justify-between">
          <span>Quote Summary</span>
          {calculating && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />}
        </h2>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {lines.map((line) => (
          <div
            key={line.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-3 relative group animate-in fade-in duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold leading-tight">{line.productName}</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">{line.sku}</p>
                {line.request.answers && line.request.answers.length > 0 && (
                  <div className="text-[9px] text-[var(--accent)] font-semibold mt-1">
                    Custom Configured ({line.request.answers.length} options)
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(line.id)}
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition shrink-0"
                aria-label="Remove product"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border)]/50">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">Qty:</span>
              <div className="flex items-center rounded border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden scale-90 origin-left">
                <button
                  type="button"
                  onClick={() => onUpdateQty(line.id, line.request.quantity - 1)}
                  className="px-2 py-0.5 hover:bg-zinc-800 text-[var(--text-muted)]"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="px-3 py-0.5 text-xs font-bold w-10 text-center">
                  {line.request.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQty(line.id, line.request.quantity + 1)}
                  className="px-2 py-0.5 hover:bg-zinc-800 text-[var(--text-muted)]"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {lines.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-4 py-8 text-center text-xs text-[var(--text-muted)]">
            Add products to calculate a quote.
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-3">
        <label className="block text-xs font-semibold">
          <span className="text-[var(--text-muted)] uppercase tracking-wider">Discount %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={discountPercent}
            onChange={(event) =>
              onDiscountChange(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
            }
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none font-mono"
          />
        </label>
      </div>

      {checkout && (
        <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-3 text-xs">
          {!showCustomer && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                Line Items Pricing
              </span>
              <div className="space-y-1 bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border)]">
                {checkout.items.map((item, index) => {
                  const line = lines.find((l) => l.request.productId === item.productId)
                  return (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex justify-between text-[11px] py-1 border-b border-[var(--border)] last:border-0"
                    >
                      <span className="text-[var(--text-muted)] truncate max-w-[180px]">
                        {line?.productName ?? item.productId} (x{item.quantity})
                      </span>
                      <div className="space-x-2">
                        <span className="text-zinc-400">D: {formatMoney(item.dealerTotal)}</span>
                        <span className="text-[var(--accent)] font-semibold">
                          C: {formatMoney(item.customerTotal)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            {showCustomer ? (
              <>
                <SummaryRow label="Customer Total" value={formatMoney(checkout.totalCustomerPrice)} />
                {checkout.discountAmount > 0 && (
                  <SummaryRow
                    label={`Discount Offered (${checkout.discountPercent}%)`}
                    value={`-${formatMoney(checkout.discountAmount)}`}
                    accentColor="text-emerald-400"
                  />
                )}
                <SummaryRow
                  label="Final Customer Total"
                  value={formatMoney(checkout.finalCustomerTotal)}
                  highlight
                />
              </>
            ) : (
              <>
                <SummaryRow label="Total Dealer Cost" value={formatMoney(checkout.totalDealerCost)} />
                <SummaryRow
                  label="Customer Total"
                  value={formatMoney(checkout.totalCustomerPrice)}
                />
                <SummaryRow
                  label={`Discount (${checkout.discountPercent}%)`}
                  value={`-${formatMoney(checkout.discountAmount)}`}
                  accentColor="text-red-400"
                />
                <SummaryRow
                  label="Final Customer Total"
                  value={formatMoney(checkout.finalCustomerTotal)}
                />
                <SummaryRow
                  label="Total Dealer Margin"
                  value={formatMoney(checkout.totalMargin)}
                  accentColor="text-emerald-400"
                />
                <SummaryRow
                  label="Final Dealer Margin"
                  value={formatMoney(checkout.finalMargin)}
                  accentColor="text-emerald-400"
                  highlight
                />
              </>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] py-2 text-xs font-semibold hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition"
            >
              Generate Quote
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] py-2 text-xs font-semibold hover:bg-[var(--accent)] hover:text-white transition"
            >
              Create Lead
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default function DealerProducts() {
  const { selectedChannelId: authSelectedChannelId } = useAuth()
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([])
  const [activeProduct, setActiveProduct] = useState<DealerProductSummary | null>(null)
  const [selectedProductDetailId, setSelectedProductDetailId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCustomer, setShowCustomer] = useState(false)

  const [draft, setDraft] = useState<ConfigDraft>({
    quantity: 1,
    answers: {},
  })
  const [discountPercent, setDiscountPercent] = useState(0)
  const [checkout, setCheckout] = useState<DealerCheckoutResponse | null>(null)

  const channelsQuery = useQuery({
    queryKey: ["dealer-channels"],
    queryFn: DealerAPI.listChannels,
  })

  useEffect(() => {
    const channels = channelsQuery.data ?? []
    if (channels.length === 0 || selectedChannelId) return

    const storedChannelId =
      window.localStorage.getItem(SELECTED_CHANNEL_STORAGE_KEY) ?? authSelectedChannelId
    const restoredChannel = channels.find((channel) => channel.id === storedChannelId)
    const nextChannelId = restoredChannel?.id ?? channels[0]?.id

    if (nextChannelId) {
      setSelectedChannelId(nextChannelId)
      window.localStorage.setItem(SELECTED_CHANNEL_STORAGE_KEY, nextChannelId)
    }
  }, [authSelectedChannelId, channelsQuery.data, selectedChannelId])

  // Get Categories list
  const categoriesQuery = useQuery({
    queryKey: ["dealer-categories"],
    queryFn: ProductAPI.listCategories,
    enabled: Boolean(selectedChannelId),
  })

  // Append virtual Custom Products category to list
  const categoriesList = useMemo(() => {
    const apiCats = categoriesQuery.data ?? []
    return [
      ...apiCats,
      {
        id: "custom-configurable-virtual",
        name: "Custom Products",
      },
    ]
  }, [categoriesQuery.data])

  // Auto-select first category when loaded
  useEffect(() => {
    if (categoriesList.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categoriesList[0].id)
    }
  }, [categoriesList, selectedCategoryId])

  // Get Products matching current category
  const productsQuery = useQuery({
    queryKey: ["dealer-products-by-category", selectedCategoryId, selectedChannelId],
    queryFn: () => {
      if (selectedCategoryId === "custom-configurable-virtual") {
        return ProductAPI.listDealerProducts().then((products) =>
          products.filter((p) => p.isConfigurable)
        )
      }
      return ProductAPI.listProductsByCategory(selectedCategoryId ?? "")
    },
    enabled: Boolean(selectedCategoryId && selectedChannelId),
  })

  // Get Channel Pricing info to merge prices onto listed products
  const pricingQuery = useQuery({
    queryKey: ["dealer-channel-pricing", selectedChannelId],
    queryFn: () => DealerAPI.listChannelPricing(selectedChannelId ?? ""),
    enabled: Boolean(selectedChannelId),
  })

  // Get Full details for the selected product (for details view drawer)
  const productDetailQuery = useQuery({
    queryKey: ["dealer-product-detail", selectedProductDetailId],
    queryFn: () => ProductAPI.getDealerProduct(selectedProductDetailId ?? ""),
    enabled: Boolean(selectedProductDetailId),
  })

  // Merge pricing into detail object
  const productDetailWithPricing = useMemo(() => {
    const detail = productDetailQuery.data
    if (!detail) return null
    const pricing = pricingQuery.data ?? []
    const priceInfo = pricing.find((p) => p.productId === detail.productId)
    return {
      ...detail,
      dealerPrice: priceInfo?.dealerPrice,
      customerPrice: priceInfo?.customerPrice,
      margin: priceInfo?.margin,
      marginPercent: priceInfo?.marginPercent,
    }
  }, [productDetailQuery.data, pricingQuery.data])

  // CIS Options and Configurations query
  const configQuery = useQuery({
    queryKey: [
      "dealer-product-configuration-pricing",
      selectedChannelId,
      activeProduct?.productId,
      activeProduct?.configurationId,
    ],
    queryFn: () =>
      DealerAPI.getChannelProductConfigurationPricing(
        selectedChannelId ?? "",
        activeProduct?.productId ?? "",
        activeProduct?.configurationId ?? ""
      ),
    enabled: Boolean(
      selectedChannelId && activeProduct?.productId && activeProduct?.configurationId
    ),
  })

  // Checkout Mutation for recalculating prices
  const checkoutMutation = useMutation({
    mutationFn: ({
      channelId,
      payload,
    }: {
      channelId: string
      payload: DealerCheckoutRequest
    }) => DealerAPI.checkout(channelId, payload),
    onSuccess: setCheckout,
  })

  // Autocalculate quote whenever items or discounts change
  useEffect(() => {
    if (quoteLines.length > 0 && selectedChannelId) {
      checkoutMutation.mutate({
        channelId: selectedChannelId,
        payload: {
          discountPercent,
          items: quoteLines.map((line) => line.request),
        },
      })
    } else {
      setCheckout(null)
    }
  }, [quoteLines, discountPercent, selectedChannelId])

  // Merge categories and products with pricing
  const mergedProducts = useMemo(() => {
    const products = productsQuery.data ?? []
    const pricing = pricingQuery.data ?? []
    const pricingByProduct = new Map(pricing.map((price) => [price.productId, price]))

    return products.map((product) => ({
      ...product,
      ...pricingByProduct.get(product.productId),
    }))
  }, [productsQuery.data, pricingQuery.data])

  // Filter listed products by Search Query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return mergedProducts
    const q = searchQuery.toLowerCase()
    return mergedProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [mergedProducts, searchQuery])

  function addProduct(product: DealerProductSummary & { customerPrice?: number }) {
    setQuoteLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productName: product.name,
        sku: product.sku,
        request: {
          productId: product.productId,
          quantity: 1,
        },
      },
    ])
  }

  function openConfiguration(product: DealerProductSummary) {
    setActiveProduct(product)
    setDraft({ quantity: 1, answers: {} })
  }

  // Add configured item to quote
  function addConfiguredProduct() {
    if (!activeProduct || !configQuery.data) return

    setQuoteLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productName: activeProduct.name,
        sku: activeProduct.sku,
        request: {
          productId: activeProduct.productId,
          quantity: draft.quantity,
          configurationId: configQuery.data.configurationId,
          configurationVersion: configQuery.data.configurationVersion,
          answers: Object.entries(draft.answers).map(([questionId, answer]) =>
            buildCheckoutAnswer(questionId, answer)
          ),
        },
      },
    ])
    setActiveProduct(null)
  }

  function updateQuoteLineQuantity(id: string, qty: number) {
    setQuoteLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              request: {
                ...line.request,
                quantity: Math.max(1, qty),
              },
            }
          : line
      )
    )
  }

  if (channelsQuery.isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        <span>Loading dealer channels...</span>
      </div>
    )
  }

  if (channelsQuery.error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {channelsQuery.error instanceof Error
          ? toUserFacingErrorMessage(channelsQuery.error)
          : "Failed to load dealer channels."}
      </div>
    )
  }

  const channels = channelsQuery.data ?? []

  if (channels.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)] space-y-2">
        <p className="font-bold">You are not assigned to any dealer channel.</p>
        <p className="text-xs">Please contact an administrator.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-soft)] via-transparent to-transparent opacity-10 pointer-events-none"></div>
        <div className="space-y-1.5 relative z-10">
          <p className="text-xs uppercase tracking-widest text-[var(--accent)] font-bold">
            Dealer Products Catalog
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Explore categories and configure quotes
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Show Customer Toggle */}
          <button
            type="button"
            onClick={() => setShowCustomer((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all duration-300 ${
              showCustomer
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-zinc-800/40 border-zinc-700 text-[var(--text-muted)] hover:text-white"
            }`}
          >
            {showCustomer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showCustomer ? "Show Customer: ON" : "Show Customer: OFF"}
          </button>

          {/* Channel Selector */}
          <label className="text-xs font-semibold flex items-center gap-2 border border-[var(--border)] rounded-lg bg-[var(--bg-panel)] px-3 py-1.5">
            <span className="text-[var(--text-muted)] uppercase tracking-wider">Channel:</span>
            <select
              value={selectedChannelId ?? ""}
              onChange={(event) => {
                const nextChannelId = event.target.value
                setSelectedChannelId(nextChannelId)
                window.localStorage.setItem(SELECTED_CHANNEL_STORAGE_KEY, nextChannelId)
                setQuoteLines([])
                setCheckout(null)
                setActiveProduct(null)
                setSelectedProductDetailId(null)
              }}
              className="bg-transparent text-[var(--text-primary)] border-0 focus:ring-0 focus:outline-none font-semibold text-xs py-0 pr-6"
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id} className="bg-[var(--bg-card)]">
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Circular Categories List */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
          Product Categories
        </h3>
        <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 px-1 scroll-smooth">
          {categoriesQuery.isLoading && (
            <div className="flex gap-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-16 w-16 rounded-full bg-[var(--bg-panel)] animate-pulse border border-[var(--border)]"></div>
                  <div className="h-3 w-12 bg-[var(--bg-panel)] animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          )}

          {categoriesList.map((cat) => {
            const isActive = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategoryId(cat.id)
                  setSelectedProductDetailId(null)
                }}
                className="flex flex-col items-center gap-2 group focus:outline-none transition min-w-[76px]"
              >
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-300 ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105"
                      : "border-[var(--border)] bg-[var(--bg-panel)] group-hover:border-zinc-500 group-hover:scale-102"
                  }`}
                >
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-[var(--accent)] uppercase">
                      {cat.name.slice(0, 2)}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold tracking-wide text-center transition ${
                    isActive
                      ? "text-[var(--accent)] font-bold"
                      : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-[var(--text-muted)] sm:ml-auto">
          Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
        </div>
      </section>

      {/* Main Catalog / Sidebar Split Grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Products Grid */}
        <main className="space-y-5">
          {productsQuery.isLoading && (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3 animate-pulse">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
                />
              ))}
            </div>
          )}

          {!productsQuery.isLoading && filteredProducts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  onAdd={addProduct}
                  onConfigure={openConfiguration}
                  onViewDetails={(id) => {
                    setSelectedProductDetailId(id)
                    setActiveProduct(null) // Close configuration panel if open
                  }}
                  showCustomer={showCustomer}
                />
              ))}
            </div>
          )}

          {!productsQuery.isLoading && filteredProducts.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-panel)] px-6 py-16 text-center text-sm text-[var(--text-muted)] space-y-1">
              <HelpCircle className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-50" />
              <p className="font-semibold text-sm mt-2">No products match your criteria.</p>
              <p className="text-xs">Try selecting another category or resetting the search query.</p>
            </div>
          )}
        </main>

        {/* Side Panel / Drawers (Detail / Configuration / Quote Summary) */}
        <div className="space-y-6">
          {/* Configurator Drawer */}
          {activeProduct && (
            <ConfigurationPanel
              product={activeProduct}
              config={configQuery.data}
              draft={draft}
              loading={configQuery.isLoading}
              error={configQuery.error}
              showCustomer={showCustomer}
              onDraftChange={setDraft}
              onAdd={addConfiguredProduct}
              onClose={() => setActiveProduct(null)}
            />
          )}

          {/* Product Detail Drawer */}
          {selectedProductDetailId && productDetailWithPricing && (
            <ProductDetailPanel
              product={productDetailWithPricing}
              onClose={() => setSelectedProductDetailId(null)}
              onAdd={addProduct}
              onConfigure={openConfiguration}
              showCustomer={showCustomer}
            />
          )}

          {/* Quote Summary Drawer */}
          <QuoteSummary
            lines={quoteLines}
            checkout={checkout}
            calculating={checkoutMutation.isPending}
            discountPercent={discountPercent}
            showCustomer={showCustomer}
            onDiscountChange={setDiscountPercent}
            onRemove={(id) =>
              setQuoteLines((current) => current.filter((line) => line.id !== id))
            }
            onUpdateQty={updateQuoteLineQuantity}
          />
        </div>
      </div>
    </div>
  )
}
