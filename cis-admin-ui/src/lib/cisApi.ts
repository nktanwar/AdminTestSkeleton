import { clearAuthState, getToken } from "./auth"

function resolveCisBaseUrl(): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    ""

  if (!rawBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.")
  }

  return rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl
}

function resolveCisUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`
  return `${resolveCisBaseUrl()}${normalizedEndpoint}`
}

async function cisRequest<T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const response = await fetch(resolveCisUrl(endpoint), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthState()
      if (window.location.hash !== "#/login") {
        window.location.replace("/#/login")
      }
    }

    const text = await response.text()
    throw new Error(
      text.trim() || "CIS API Error"
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return await response.json()
  }

  return (await response.text()) as T
}

export interface AdminChannelProductPricingResponse {
  id: string
  channelId: string
  productId: string
  dealerPrice: number
  customerPrice: number
  currency: string
  active: boolean
}

export interface AdminChannelProductPricingItem {
  productId: string
  dealerPrice: number
  customerPrice: number
}

export interface AdminChannelProductPricingPayload {
  productId: string
  dealerPrice: number
  customerPrice: number
}

export type PricingType = "FIXED" | "PER_UNIT" | "AREA"

export interface AdminChannelOptionPricingItem {
  id: string
  channelId: string
  productId: string
  configurationId: string
  configurationVersion: number
  questionId: string
  optionId: string
  pricingType: PricingType
  dealerPrice?: number | null
  customerPrice?: number | null
  dealerRate?: number | null
  customerRate?: number | null
}

export interface AdminChannelOptionPricingPayload {
  productId: string
  configurationId: string
  configurationVersion: number
  questionId: string
  optionId: string
  pricingType: PricingType
  dealerPrice?: number
  customerPrice?: number
  dealerRate?: number
  customerRate?: number
}

const REQUIRED_OPTION_PRICING_FIELDS = [
  "productId",
  "configurationId",
  "configurationVersion",
  "questionId",
  "optionId",
  "pricingType",
] as const

function assertOptionPricingPayload(
  payload: AdminChannelOptionPricingPayload
): void {
  for (const field of REQUIRED_OPTION_PRICING_FIELDS) {
    const value = payload[field]
    if (
      value == null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      throw new Error(`${field} is required for option pricing.`)
    }
  }
}

export const CISAPI = {
  listProductPricing: (channelId: string) =>
    cisRequest<AdminChannelProductPricingItem[]>(
      `/api/admin/channels/${channelId}/pricing/products`
    ),

  updateProductPricing: (
    channelId: string,
    payload: AdminChannelProductPricingPayload
  ) =>
    cisRequest<AdminChannelProductPricingResponse>(
      `/api/admin/channels/${channelId}/pricing/products`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),

  listOptionPricing: (
    channelId: string,
    productId: string,
    configurationId: string
  ) =>
    cisRequest<AdminChannelOptionPricingItem[]>(
      `/api/admin/channels/${channelId}/pricing/products/${productId}/configurations/${configurationId}`
    ),

  updateOptionPricing: (
    channelId: string,
    payload: AdminChannelOptionPricingPayload
  ) => {
    assertOptionPricingPayload(payload)

    return cisRequest<AdminChannelOptionPricingItem>(
      `/api/admin/channels/${channelId}/pricing/options`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    )
  },
}
