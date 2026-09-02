// src/lib/api.ts

import type { Channel } from "../types/channel"
import type { DealerProduct } from "./productApi"
import { API_CONFIG, joinBaseAndPath } from "./apiConfig"
import { clearAuthState, getToken } from "./auth"
import {
  isRegistrationIncompleteMessage,
  toUserFacingErrorMessage,
} from "./errors"

function resolveApiUrl(
  path: string,
  useBaseUrl = true
): string {
  if (!useBaseUrl) return path
  return joinBaseAndPath(API_CONFIG.internalBaseUrl, path)
}

export class ApiError extends Error {
  readonly status: number
  readonly rawBody: string

  constructor(status: number, message: string, rawBody = "") {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.rawBody = rawBody
  }
}

export class RegistrationIncompleteError extends ApiError {
  readonly email: string

  constructor(email: string, rawBody = "") {
    super(
      409,
      "Your registration is almost complete. Please finish setting up your account.",
      rawBody
    )
    this.name = "RegistrationIncompleteError"
    this.email = email
  }
}

function defaultErrorMessage(status: number): string {
  if (status === 400) return "Invalid request."
  if (status === 403) return "Not authorized."
  if (status === 409) return "Request conflicts with current state."
  return "API error"
}

function stripHtmlTags(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function parseErrorMessage(body: string): string | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as {
      message?: unknown
      error?: unknown
    }
    if (typeof parsed.message === "string") return parsed.message
    if (typeof parsed.error === "string") return parsed.error
  } catch {
    // Non-JSON response
  }

  const trimmed = body.trim()
  const isHtml =
    /^<!doctype html/i.test(trimmed) ||
    /<html[\s>]/i.test(trimmed)
  if (isHtml) {
    const titleMatch = trimmed.match(
      /<title>([^<]+)<\/title>/i
    )
    const h1Match = trimmed.match(/<h1>([^<]+)<\/h1>/i)
    const candidate = titleMatch?.[1] ?? h1Match?.[1] ?? ""
    const plain = stripHtmlTags(candidate || trimmed)
    if (plain) {
      const tomcatStatusMatch = plain.match(
        /^HTTP Status\s+\d+\s+[–-]\s+(.+)$/i
      )
      if (tomcatStatusMatch?.[1]) {
        return tomcatStatusMatch[1].trim()
      }
      return plain
    }
    return null
  }

  return trimmed || null
}

async function api<T>(
  path: string,
  options: RequestInit = {},
  config: { useBaseUrl?: boolean } = {}
): Promise<T> {
  const token = getToken()
  const requestUrl = resolveApiUrl(
    path,
    config.useBaseUrl ?? true
  )
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(requestUrl, {
    ...options,
    headers: requestHeaders,
  })

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 401) {
      clearAuthState()
      if (window.location.hash !== "#/login") {
        window.location.replace("/#/login")
      }
    }
    throw new ApiError(
      res.status,
      toUserFacingErrorMessage(
        {
          status: res.status,
          message:
            parseErrorMessage(text) ??
            defaultErrorMessage(res.status),
        },
        defaultErrorMessage(res.status)
      ),
      text
    )
  }

  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return await res.json()
  }

  const text = await res.text()
  if (!text) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}



/* -------- Channels -------- */

export const ChannelAPI = {
  list: () => api<Channel[]>("/internal/channels"),

  create: (payload: { name: string; code: string }) =>
    api<Channel>("/internal/channels", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deactivate: (id: string) =>
    api<Channel>(`/internal/channels/${id}/deactivate`, {
      method: "POST",
    }),

    get: (id: string) =>
  api<Channel>(`/internal/channels/${id}`),

  updateSettings: (
    id: string,
    payload: {
      walletEnabled: boolean
      knowledgeCenterAccess: boolean
      pricingEnabled: boolean
    }
  ) =>
    api<Channel>(`/internal/channels/${id}/settings`, {
      method: "PUT",
      body: JSON.stringify({
        walletEnabled: payload.walletEnabled,
        knowledgeCenterAccess: payload.knowledgeCenterAccess,
        pricingEnable: payload.pricingEnabled,
      }),
    }),

  me: (channelId: string) =>
    api<ChannelMe>(`/internal/channels/${channelId}/me`),

}

export interface ChannelCapabilities {
  canViewMembers: boolean
  canAddMember: boolean
  canManagePermissions: boolean
  canUpdateChannel: boolean
}

export interface ChannelMe {
  userId: string
  channelId: string
  isAdmin: boolean
  capabilities: ChannelCapabilities
}

export interface DashboardSummary {
  totalLeads: number
  conversionRate: number
}

export interface DashboardSalesLeaderboardEntry {
  name: string
  assignedLeads: number
  converted: number
  conversionRate: number
}

export interface DashboardDealerPerformanceEntry {
  name: string
  leads: number
  converted: number
  conversionRate: number
}

export interface DashboardRecentFunnel {
  id: string
  name: string
  createdAt: string
}

export interface DashboardResponse {
  summary: DashboardSummary
  salesLeaderboard: DashboardSalesLeaderboardEntry[]
  dealerPerformance: DashboardDealerPerformanceEntry[]
  recentFunnels: DashboardRecentFunnel[]
  dealerCount: number
}

export interface AdminDashboardSummary {
  totalUsers: number
  totalChannels: number
  activeChannels: number
  totalKnowledgeCenters: number
  activeKnowledgeCenters: number
  totalKnowledgeItems: number
  totalLeads: number
  activeLeads: number
  closedLeads: number
}

export interface DealerDashboardSummary {
  assignedLeads: number
  activeLeads: number
  closedLeads: number
  accessibleChannels: number
  accessibleKnowledgeCenters: number
  conversionRate: number
}

export interface DealerChannel {
  id: string
  name: string
  code: string
  status: "ACTIVE" | "INACTIVE" | string
  walletEnabled: boolean
  knowledgeCenterAccess: boolean
  pricingEnabled?: boolean
  pricingEnable?: boolean
}

export interface DealerKnowledgeCenter {
  id: string
  name: string
  description?: string | null
  status: "ACTIVE" | "INACTIVE" | string
  createdAt: string
}

export interface KnowledgeCenter {
  id: string
  name: string
  description?: string | null
  status: "ACTIVE" | "INACTIVE" | string
  createdAt: string
  createdBy?: string | null
}

export type KnowledgeItemType =
  | "ARTICLE"
  | "VIDEO"
  | "LINK"
  | "DOCUMENT"

export interface KnowledgeItem {
  id: string
  knowledgeCenterId: string
  title: string
  description?: string | null
  type: KnowledgeItemType
  content: string
  tags: string[]
  isPublished: boolean
  createdAt: string
  createdBy?: string | null
  updatedAt?: string | null
}

export interface CreateKnowledgeCenterPayload {
  name: string
  description?: string
}

export interface CreateKnowledgeItemPayload {
  title: string
  description?: string
  type: KnowledgeItemType
  content: string
  tags?: string[]
}

export interface UpdateKnowledgeItemPayload
  extends CreateKnowledgeItemPayload {
  isPublished: boolean
}

export interface DealerLeadStageHistoryItem {
  from?: string | null
  to?: string | null
  changedAt?: string | null
  changedByName?: string | null
  comment?: string | null
  [key: string]: unknown
}

export interface DealerLeadEvent {
  type?: string | null
  createdAt?: string | null
  message?: string | null
  note?: string | null
  [key: string]: unknown
}

export interface DealerLead {
  id: string
  ownerName: string
  stage: string
  status: string
  source: string
  customerSnapshot: {
    name: string
    phone: string
    email: string | null
  }
  createdAt: string
  creatorName: string
  closedAt: string | null
  stageHistory: DealerLeadStageHistoryItem[]
  events: DealerLeadEvent[]
}

export interface UpdateDealerLeadStagePayload {
  stage: string
  comment?: string
}

export interface CreateUserPayload {
  name: string
  email: string
  phone?: string
  password: string
  role: "ADMIN" | "STANDARD" | "DEALER"
}

export type DealerProvisioningStatus =
  | "NOT_APPLICABLE"
  | "IN_PROCESS"
  | "SUCCESS"
  | "FAILED"

export interface CreatedUserResponse {
  id: string
  name: string
  email: string
  password?: string
  phone?: string
  role?: CreateUserPayload["role"] | string
  dealerProvisioningStatus?: DealerProvisioningStatus | string
  provisioningMessage?: string
  message?: string
}

export interface CompleteRegistrationPayload {
  username: string
  phoneNumber: string
  password: string
}

export interface AuthTokenResponse {
  token?: string
}

export interface DealerProductPricing {
  productId: string
  dealerPrice: number
  customerPrice: number
  margin: number
  marginPercent: number
}

export type ChannelPricingType = "FIXED" | "PER_UNIT" | "AREA"

export interface ChannelPricingOptionResponse {
  optionId: string
  optionLabel: string
  pricingType: ChannelPricingType
  dealerPrice?: number
  customerPrice?: number
  dealerRate?: number
  customerRate?: number
  configured: boolean
}

export interface ChannelPricingQuestionResponse {
  questionId: string
  questionText: string
  questionType: string
  options: ChannelPricingOptionResponse[]
}

export interface ChannelProductConfigurationPricingResponse {
  productId: string
  productName: string
  configurationId: string
  configurationVersion: number
  questions: ChannelPricingQuestionResponse[]
}

export interface DealerCheckoutAnswerRequest {
  questionId: string
  optionId?: string
  value?: number
  areaValue?: {
    length: number
    width: number
  }
}

export interface DealerCheckoutItemRequest {
  productId: string
  quantity: number
  configurationId?: string | null
  configurationVersion?: number | null
  answers?: DealerCheckoutAnswerRequest[]
}

export interface DealerCheckoutRequest {
  discountPercent?: number
  items: DealerCheckoutItemRequest[]
}

export interface DealerCheckoutResponseItem {
  productId: string
  quantity: number
  dealerUnitPrice: number
  customerUnitPrice: number
  dealerTotal: number
  customerTotal: number
  margin: number
  finalCustomerTotal: number
}

export interface DealerCheckoutResponse {
  items: DealerCheckoutResponseItem[]
  totalDealerCost: number
  totalCustomerPrice: number
  totalMargin: number
  discountPercent: number
  discountAmount: number
  finalCustomerTotal: number
  finalMargin: number
}

export interface PageResponse<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  first?: boolean
  last?: boolean
}

export interface DealerPricingChannel {
  channelId: string
  name: string
  code: string
  isDefault: boolean
}

interface DealerPricingChannelWire {
  channelId?: unknown
  id?: unknown
  _id?: unknown
  name?: unknown
  code?: unknown
  isDefault?: unknown
  default?: unknown
}

function getStringField(
  source: DealerPricingChannelWire,
  field: keyof DealerPricingChannelWire
): string {
  const value = source[field]
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null) {
    const objectValue = value as Record<string, unknown>
    if (typeof objectValue.$oid === "string") return objectValue.$oid
    if (typeof objectValue.oid === "string") return objectValue.oid
    if (typeof objectValue.value === "string") return objectValue.value
  }
  return ""
}

function normalizeDealerPricingChannel(
  channel: DealerPricingChannelWire
): DealerPricingChannel {
  const channelId =
    getStringField(channel, "channelId") ||
    getStringField(channel, "id") ||
    getStringField(channel, "_id")

  return {
    channelId,
    name: getStringField(channel, "name") || "Unnamed channel",
    code: getStringField(channel, "code") || channelId,
    isDefault:
      channel.isDefault === true || channel.default === true,
  }
}

export type DealerOrderPaymentStatus = "PENDING" | "SUCCESS" | string
export type DealerAnalyticsPaymentStatus = "PENDING" | "SUCCESS"

export interface DealerOrderAddress {
  street?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  landmark?: string | null
  country?: string | null
}

export interface DealerOrderConfiguration {
  configurationId: string
  version: number
  answers: DealerCheckoutAnswerRequest[]
}

export interface DealerOrderItem {
  productId: string
  name: string
  sku?: string | null
  quantity: number
  color?: unknown[]
  description?: string | null
  categoryId?: string | null
  imageUrl?: string | null
  price?: number | null
  metaData?: Record<string, unknown>
  configuration?: DealerOrderConfiguration | null
}

export interface DealerOrderInternalResponse {
  orderId: string
  dealerId: string
  dealerPhoneNumber?: string | null
  customerId?: string | null
  customerName?: string | null
  customerPhoneNumber?: string | null
  customerAddress?: DealerOrderAddress | null
  items: DealerOrderItem[]
  totalPrice: number
  state: string
  paymentMethod: string
  paymentStatus: DealerOrderPaymentStatus
  metaData?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface DealerOrderAnalyticsItem {
  productId: string
  quantity: number
  dealerUnitPrice: number
  customerUnitPrice: number
  dealerTotal: number
  customerTotal: number
}

export interface DealerOrderAnalyticsResponse {
  id: string
  orderId: string
  dealerId: string
  pricingChannelId: string
  items: DealerOrderAnalyticsItem[]
  totalDealerCost: number
  originalCustomerTotal: number
  discountPercent: number
  discountAmount: number
  finalCustomerTotal: number
  dealerProfit: number
  orderState: string
  paymentMethod: string
  paymentStatus: DealerOrderPaymentStatus
  createdAt: string
  updatedAt: string
}

export interface StoreDealerOrderRequest extends DealerCheckoutRequest {
  orderId: string
  paymentStatus: DealerAnalyticsPaymentStatus
}

export type DealerDashboardProduct = DealerProduct &
  Partial<DealerProductPricing>

export const DashboardAPI = {
  get: (channelId: string) =>
    api<DashboardResponse>(
      "/internal/channels/" + channelId + "/dashboard"
    ),
}

export const AdminAPI = {
  getDashboardSummary: () =>
    api<AdminDashboardSummary>("/api/admin/dashboard/summary"),
}

export const DealerAPI = {
  getDashboardSummary: () =>
    api<DealerDashboardSummary>("/api/dealer/dashboard/summary"),

  listChannels: () =>
    api<DealerChannel[]>("/api/dealer/dashboard/channels"),

  listKnowledgeCenters: () =>
    api<DealerKnowledgeCenter[]>(
      "/api/dealer/dashboard/knowledge-centers"
    ),

  listLeads: () => api<DealerLead[]>("/api/dealer/leads"),

  getLead: (leadId: string) =>
    api<DealerLead>(`/api/dealer/leads/${leadId}`),

  updateLeadStage: (
    leadId: string,
    payload: UpdateDealerLeadStagePayload
  ) =>
    api<DealerLead>(`/api/dealer/leads/${leadId}/stage`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  listChannelPricing: (channelId: string) =>
    api<DealerProductPricing[]>(
      `/api/dealer/channels/${channelId}/pricing`
    ),

  getChannelProductPricing: (
    channelId: string,
    productId: string
  ) =>
    api<DealerProductPricing>(
      `/api/dealer/channels/${channelId}/pricing/products/${productId}`
    ),

  getChannelProductConfigurationPricing: (
    channelId: string,
    productId: string,
    configurationId: string
  ) =>
    api<ChannelProductConfigurationPricingResponse>(
      `/api/dealer/channels/${channelId}/pricing/products/${productId}/configurations/${configurationId}`
    ),

  checkout: (channelId: string, payload: DealerCheckoutRequest) =>
    api<DealerCheckoutResponse>(`/api/dealer/channels/${channelId}/checkout`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listOrders: (page = 0, size = 50) =>
    api<PageResponse<DealerOrderInternalResponse>>(
      `/dealer/orders?page=${page}&size=${size}`
    ),

  listOrderAnalytics: (page = 0, size = 50) =>
    api<PageResponse<DealerOrderAnalyticsResponse>>(
      `/dealer/orders/analytics?page=${page}&size=${size}`
    ),

  listPricingChannels: () =>
    api<DealerPricingChannelWire[]>("/api/dealer/pricing/channels").then(
      (channels) =>
        channels
          .map(normalizeDealerPricingChannel)
          .filter((channel) => channel.channelId)
    ),

  setDefaultPricingChannel: (channelId: string) =>
    api<DealerPricingChannelWire>(
      `/api/dealer/pricing/channels/${channelId}/default`,
      {
        method: "POST",
      }
    ).then(normalizeDealerPricingChannel),

  calculatePricing: (payload: DealerCheckoutRequest) =>
    api<DealerCheckoutResponse>("/api/dealer/pricing/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addOrderSnapshot: (payload: StoreDealerOrderRequest) =>
    api<DealerOrderAnalyticsResponse>("/dealer/orders/add-snapshot", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  markOrderPaymentDone: (orderId: string) =>
    api<DealerOrderAnalyticsResponse>(
      `/dealer/orders/${orderId}/analytics/payment-done`,
      {
        method: "POST",
      }
    ),
}

export const KnowledgeCenterAPI = {
  create: (payload: CreateKnowledgeCenterPayload) =>
    api<KnowledgeCenter>("/api/knowledge-centers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listMine: () =>
    api<KnowledgeCenter[]>("/api/knowledge-centers/me"),

  get: (knowledgeCenterId: string) =>
    api<KnowledgeCenter>(
      `/api/knowledge-centers/${knowledgeCenterId}`
    ),

  addUserAccess: (
    knowledgeCenterId: string,
    payload: { userId: string }
  ) =>
    api<void>(
      `/api/knowledge-centers/${knowledgeCenterId}/users`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  addChannelAccess: (
    knowledgeCenterId: string,
    payload: { channelId: string }
  ) =>
    api<void>(
      `/api/knowledge-centers/${knowledgeCenterId}/channels`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
}

export const KnowledgeItemAPI = {
  create: (
    knowledgeCenterId: string,
    payload: CreateKnowledgeItemPayload
  ) =>
    api<KnowledgeItem>(
      `/api/knowledge/knowledge-centers/${knowledgeCenterId}/items`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  list: (knowledgeCenterId: string) =>
    api<KnowledgeItem[]>(
      `/api/knowledge/knowledge-centers/${knowledgeCenterId}/items`
    ),

  get: (itemId: string) =>
    api<KnowledgeItem>(`/api/knowledge/items/${itemId}`),

  update: (itemId: string, payload: UpdateKnowledgeItemPayload) =>
    api<KnowledgeItem>(`/api/knowledge/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (itemId: string) =>
    api<void>(`/api/knowledge/items/${itemId}`, {
      method: "DELETE",
    }),
}


/* -------- Auth -------- */

export const AuthAPI = {
  login: (email: string, password: string) =>
    api<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).catch((error: unknown) => {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        isRegistrationIncompleteMessage(
          `${error.message} ${error.rawBody}`
        )
      ) {
        throw new RegistrationIncompleteError(email, error.rawBody)
      }

      throw error
    }),

  completeRegistration: (
    payload: CompleteRegistrationPayload,
    firebaseIdToken: string
  ) =>
    api<AuthTokenResponse>(
      "/auth/complete-registration",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firebaseIdToken}`,
        },
        body: JSON.stringify(payload),
      }
    ),

  createUser: (payload: CreateUserPayload) =>
    api<CreatedUserResponse>("/auth/create-user", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Session check used at app bootstrap. If API is unreachable or auth is invalid,
  // we treat the session as invalid and force logout.
  validateSession: async () => {
    const token = getToken()
    if (!token) return false

    try {
      return true
    } catch {
      clearAuthState()
      return false
    }
  },
}


/* -------- Channel Members -------- */

export interface ChannelMember {
  id: string
  name: string
  email: string
  userId: string | null
  permissionSet: string
  status: "ACTIVE" | "DEACTIVATED"
}

export interface AddChannelMemberPayload {
  userId: string | null
  permissionSetId: string
  externalName: string | null
  externalEmail: string | null
  externalPhone: string | null
}

export const ChannelMemberAPI = {
  list: (channelId: string) =>
    api<ChannelMember[]>(`/internal/channels/${channelId}/members`),

  addMember: (
    channelId: string,
    payload: AddChannelMemberPayload
  ) =>
    api<ChannelMember>(
      `/internal/channels/${channelId}/members/addMember`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  assignPermissionSet: (
    channelId: string,
    memberId: string,
    permissionSetId: string
  ) =>
    api<void>(
      `/internal/channels/${channelId}/members/${memberId}/permission-set`,
      {
        method: "PUT",
        body: JSON.stringify({ permissionSetId }),
      }
    ),
}


/* -------- Users -------- */

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  status: "ACTIVE" | "BLOCKED"
}

export const UserAPI = {
  list: () => api<User[]>("/api/users"),
}



/* -------- Permissions -------- */

export interface PermissionSet {
  id: string
  name: string
  permissions: string[]
}

function permissionToCode(value: unknown): string {
  if (typeof value === "string") return value
  if (
    value &&
    typeof value === "object" &&
    "code" in value &&
    typeof (value as { code?: unknown }).code === "string"
  ) {
    return (value as { code: string }).code
  }
  return String(value)
}

export const PermissionAPI = {
  listPermissions: async () => {
    const raw = await api<unknown[]>("/internal/permissions/atoms")
    const normalized = (raw ?? []).map(permissionToCode)
    return [...new Set(normalized)]
  },

  listSets: (channelId: string) =>
    api<PermissionSet[]>(
      `/internal/channels/${channelId}/permission-sets`
    ),

  createSet: (channelId: string, name: string) =>
    api<void>(
      `/internal/channels/${channelId}/permission-sets`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    ),

  updateSet: (
    channelId: string,
    id: string,
    permissions: string[]
  ) =>
    api<void>(
      `/internal/channels/${channelId}/permission-sets/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }
    ),

  deleteSet: (channelId: string, id: string) =>
    api<void>(
      `/internal/channels/${channelId}/permission-sets/${id}`,
      {
        method: "DELETE",
      }
    ),
}


/* -------- Funnel Definitions -------- */

export interface CreateFunnelPayload {
  name: string
}

export interface FunnelDefinition {
  id: string
  name: string
  createdBy: string
  createdAt: string
}

export const FunnelAPI = {
  list: (channelId: string) =>
    api<FunnelDefinition[]>(
      `/internal/channels/${channelId}/funnels`
    ),

  create: (
    channelId: string,
    payload: CreateFunnelPayload
  ) =>
    api<FunnelDefinition>(
      `/internal/channels/${channelId}/funnels`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  get: (channelId: string, id: string) =>
    api<FunnelDefinition>(
      `/internal/channels/${channelId}/funnels/${id}`
    ),
}


/* -------- Leads -------- */

export interface LeadCustomerSnapshot {
  name: string
  phone: string
  email: string | null
}

export interface LeadStageHistoryItem {
  [key: string]: unknown
}

export interface LeadEvent {
  [key: string]: unknown
}

export interface Lead {
  id: string
  backendId: string | null
  funnelId: string | null
  ownerMemberName: string
  stage: string
  status: string
  source: string
  customerSnapshot: LeadCustomerSnapshot
  createdAt: string
  creatorName: string
  closedAt: string | null
  stageHistory: LeadStageHistoryItem[]
  events: LeadEvent[]
  raw: Record<string, unknown>
}

export interface CreateLeadPayload {
  customerName: string
  customerPhone: string
  customerEmail?: string
  funnelId: string
}

export interface AssignLeadsPayload {
  funnelId: string
  workerId: string
  leadsId: string[]
}

export interface AssignLeadsResponse {
  message: string
}

export interface MoveLeadStagePayload {
  leadId: string
  nextStage: string
  comment?: string
}

export interface MoveLeadStageResponse {
  message: string
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }

  return null
}

function isObjectIdHex(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value)
}

function extractObjectIdHex(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (isObjectIdHex(trimmed)) {
    return trimmed.toLowerCase()
  }

  const fromObjectIdWrapper = trimmed.match(
    /objectid\((['"])?([a-f0-9]{24})\1?\)/i
  )
  if (fromObjectIdWrapper?.[2]) {
    return fromObjectIdWrapper[2].toLowerCase()
  }

  const genericMatch = trimmed.match(/\b([a-f0-9]{24})\b/i)
  if (genericMatch?.[1]) {
    return genericMatch[1].toLowerCase()
  }

  return null
}

function stableHash(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }
  return Math.abs(hash >>> 0).toString(36)
}

function toUiLeadId(value: unknown): string | null {
  const direct = toStringValue(value)
  if (direct) {
    const normalizedObjectId = extractObjectIdHex(direct)
    if (normalizedObjectId) {
      return normalizedObjectId
    }

    return `lead-${stableHash(direct)}`
  }

  const record = toRecord(value)
  if (!record) {
    return null
  }

  const timestamp = toStringValue(record.timestamp)
  const date = toStringValue(record.date)
  if (timestamp || date) {
    const safeTimestamp = (timestamp ?? "na").replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    )
    const safeDate = (date ?? "na").replace(/[^a-zA-Z0-9_-]/g, "")
    return `lead-${safeTimestamp}-${safeDate || "na"}`
  }

  const json = JSON.stringify(record)
  if (!json || json === "{}") {
    return null
  }

  return `lead-${stableHash(json)}`
}

function toObjectIdString(value: unknown): string | null {
  const direct = toStringValue(value)
  if (direct) {
    return extractObjectIdHex(direct)
  }

  const record = toRecord(value)
  if (!record) {
    return null
  }

  const objectIdKeys = [
    "$oid",
    "oid",
    "hexString",
    "id",
    "_id",
    "value",
    "toHexString",
  ]

  for (const key of objectIdKeys) {
    const rawCandidate = record[key]
    const candidate = toStringValue(rawCandidate)
    if (candidate) {
      const normalized = extractObjectIdHex(candidate)
      if (normalized) {
        return normalized
      }
    }

    const nestedCandidate =
      rawCandidate && typeof rawCandidate === "object"
        ? toObjectIdString(rawCandidate)
        : null
    if (nestedCandidate) {
      return nestedCandidate
    }
  }

  return null
}

function pickText(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const stringValue = pickString(record, [key])
    if (stringValue) {
      return stringValue
    }

    const genericValue = toStringValue(record[key])
    if (genericValue) {
      return genericValue
    }
  }

  return null
}

function toIsoOrString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }

  return null
}

function pickLeadResponseList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) {
    return raw
  }

  const record = toRecord(raw)
  if (!record) {
    return null
  }

  const keys = ["leads", "items", "content", "data", "result", "list"]
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value
    }
  }

  return null
}

function normalizeLeadItem(rawLead: unknown): Lead | null {
  const record = toRecord(rawLead)
  if (!record) return null

  const rawId = record.id ?? record._id ?? record.leadId

  const backendId =
    toObjectIdString(record.id) ??
    toObjectIdString(record._id) ??
    toObjectIdString(record.leadId)
  const funnelId =
    toObjectIdString(record.funnelId) ??
    toObjectIdString(record.funnel_id) ??
    toObjectIdString(toRecord(record.funnel)?.id)

  const id =
    backendId ??
    toUiLeadId(rawId) ??
    toUiLeadId(record.id) ??
    toUiLeadId(record._id) ??
    toUiLeadId(record.leadId)

  if (!id) return null

  const snapshotRecord =
    toRecord(record.customerSnapshot) ??
    toRecord(record.customer) ??
    {}

  const customerName =
    pickText(snapshotRecord, ["name"]) ??
    pickText(record, ["customerName", "name"]) ??
    "-"

  const customerPhone =
    pickText(snapshotRecord, ["phone"]) ??
    pickText(record, ["customerPhone", "phone"]) ??
    "-"

  const customerEmail =
    pickText(snapshotRecord, ["email"]) ??
    pickText(record, ["customerEmail", "email"])

  const stageHistory = Array.isArray(record.stageHistory)
    ? (record.stageHistory as LeadStageHistoryItem[])
    : []
  const events = Array.isArray(record.events)
    ? (record.events as LeadEvent[])
    : []

  return {
    id,
    backendId,
    funnelId,
    ownerMemberName: pickText(record, ["ownerMemberName", "ownerName"]) ?? "-",
    stage: pickText(record, ["stage"]) ?? "UNKNOWN",
    status: pickText(record, ["status"]) ?? "UNKNOWN",
    source: pickText(record, ["source"]) ?? "UNKNOWN",
    customerSnapshot: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    },
    createdAt: toIsoOrString(record.createdAt) ?? "",
    creatorName: pickText(record, ["creatorName", "createdBy"]) ?? "-",
    closedAt: toIsoOrString(record.closedAt),
    stageHistory,
    events,
    raw: record,
  }
}

function normalizeLeadListResponse(raw: unknown): Lead[] {
  const rawList = pickLeadResponseList(raw)
  if (!rawList) {
    return []
  }

  return rawList
    .map(normalizeLeadItem)
    .filter((lead): lead is Lead => lead !== null)
}

export const LeadAPI = {
  myLeads: async (channelId: string) => {
    const raw = await api<unknown>(
      `/internal/channels/${channelId}/leads/my-leads`
    )
    return normalizeLeadListResponse(raw)
  },

  list: async (channelId: string, funnelId: string) => {
    const raw = await api<unknown>(
      `/internal/channels/${channelId}/leads/funnel/${funnelId}`
    )
    return normalizeLeadListResponse(raw)
  },

  create: (
    channelId: string,
    payload: CreateLeadPayload
  ) =>
    api<void | Lead>(
      `/internal/channels/${channelId}/leads`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  assign: (
    channelId: string,
    payload: AssignLeadsPayload
  ) =>
    api<AssignLeadsResponse | void>(
      `/internal/channels/${channelId}/leads/assign`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  moveStage: (
    channelId: string,
    payload: MoveLeadStagePayload
  ) =>
    api<MoveLeadStageResponse>(
      `/internal/channels/${channelId}/leads/moveStage`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
}
