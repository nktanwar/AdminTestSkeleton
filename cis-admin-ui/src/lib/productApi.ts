import {
  API_CONFIG,
  joinBaseAndPath,
  requireConfiguredBaseUrl,
} from "./apiConfig"

export interface ProductFaq {
  question: string
  answer: string
}

export interface DisplayConfig {
  popularRank?: number
  freshRank?: number
}

export interface ProductContentItem {
  title?: string
  subtitle?: string
  description?: string
  imageUrl?: string
  buttonText?: string
  buttonUrl?: string
}

export type ProductContentSectionType =
  | "HERO_BANNER"
  | "IMAGE_TEXT"
  | "IMAGE_TEXT_REVERSE"
  | "FULL_WIDTH_BANNER"
  | "HIGHLIGHTS_GRID"
  | "FEATURE_GRID"

export interface ProductContentSection {
  id: string
  type: ProductContentSectionType
  title?: string
  subtitle?: string
  description?: string
  position: number
  enabled: boolean
  items: ProductContentItem[]
}

export interface DealerCategory {
  id: string
  name: string
  imageUrl?: string
  description?: string
}

export interface DealerProductSummary {
  productId: string
  name: string
  sku: string
  description?: string
  imageUrls?: string[]
  categoryId?: string
  isAvailable: boolean
  isCodAvailable: boolean
  isConfigurable: boolean
  configurationId?: string
}

export interface DealerProduct {
  productId: string
  name: string
  sku: string
  color?: string[]
  description?: string
  productSpecification: Record<string, string>[]
  imageUrls?: string[]
  categoryId?: string
  inventoryCount: number
  isAvailable: boolean
  isCodAvailable: boolean
  metaData?: Record<string, string>
  isConfigurable: boolean
  configurationId?: string
  faq: ProductFaq[]
  contentSections: ProductContentSection[]
  displayConfig?: DisplayConfig
  colorImageMap?: Record<string, string[]>
}


export interface CisAnswerDto {
  questionId: string
  optionId?: string
  value?: number
  areaValue?: {
    length: number
    width: number
  }
}

export interface CisConfigurationDto {
  productId: string
  configurationId: string
  version: number
  questions: ProductConfigurationQuestion[]
  [key: string]: unknown
}

export interface ProductConfigurationOption {
  optionId: string
  optionLabel: string
  configured?: boolean
}

export interface ProductConfigurationQuestion {
  questionId: string
  questionText: string
  questionType: string
  options: ProductConfigurationOption[]
}

export interface ValidateConfigurationRequest {
  productId: string
  configurationId: string
  version: number
  answers: CisAnswerDto[]
}

export interface ValidateConfigurationResponse {
  valid: boolean
}

export interface VerifyProductRequest {
  productId: string
}

export interface CisProductSummaryDto {
  productId: string
  [key: string]: unknown
}

export interface VerifyProductOptionRequest {
  productId: string
  configurationId: string
  configurationVersion: number
  questionId: string
  optionId: string
}

export interface CisProductOptionSummaryDto {
  productId: string
  configurationId: string
  configurationVersion: number
  questionId: string
  optionId: string
  [key: string]: unknown
}

function resolveProductUrl(endpoint: string): string {
  return joinBaseAndPath(
    requireConfiguredBaseUrl(
      API_CONFIG.productBaseUrl,
      "VITE_PRODUCT_API_BASE_URL"
    ),
    endpoint
  )
}

export async function productGet<T>(
  endpoint: string
): Promise<T> {
  const response = await fetch(resolveProductUrl(endpoint))

  if (!response.ok) {
    throw new Error("Product API Error")
  }

  return response.json()
}

export async function productPost<TResponse, TPayload>(
  endpoint: string,
  payload: TPayload
): Promise<TResponse> {
  const response = await fetch(resolveProductUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("Product API Error")
  }

  return response.json()
}

export const ProductAPI = {
  listCategories: () =>
    productGet<DealerCategory[]>("/public/dealer/categories"),

  listProductsByCategory: (categoryId: string) =>
    productGet<DealerProductSummary[]>(
      `/public/dealer/categories/${categoryId}/products`
    ),

  listDealerProducts: () =>
    productGet<DealerProduct[]>("/public/dealer/products"),

  getDealerProduct: (productId: string) =>
    productGet<DealerProduct>(
      `/public/dealer/products/${productId}`
    ),

  getConfiguration: (
    productId: string,
    configurationId: string
  ) =>
    productGet<CisConfigurationDto>(
      `/public/cis/products/${productId}/configurations/${configurationId}`
    ),

  validateConfiguration: (
    payload: ValidateConfigurationRequest
  ) =>
    productPost<
      ValidateConfigurationResponse,
      ValidateConfigurationRequest
    >("/public/cis/products/configurations/validate", payload),

  verifyProduct: (payload: VerifyProductRequest) =>
    productPost<CisProductSummaryDto, VerifyProductRequest>(
      "/public/cis/products/verify",
      payload
    ),

  verifyProductOption: (
    payload: VerifyProductOptionRequest
  ) =>
    productPost<
      CisProductOptionSummaryDto,
      VerifyProductOptionRequest
    >("/public/cis/products/configurations/options/verify", payload),
}
