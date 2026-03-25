// src/lib/api.ts

import type { Channel } from "../types/channel"
import { clearAuthState, getToken } from "./auth"

function sanitizeBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return ""

  const trimmed = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl

  // Some local setups accidentally set BASE_URL like:
  // - /lead/{channelId}
  // - /lead/{channelId}/lead/{channelId}
  // Strip any trailing /lead... tail so endpoint paths are not duplicated.
  return trimmed.replace(/\/lead(?:\/.*)?$/i, "")
}

const RAW_BASE_URL = sanitizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL ?? ""
)
const BASE_URL =
  RAW_BASE_URL || (import.meta.env.DEV ? "http://localhost:8082" : "")

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function joinBaseAndPath(base: string, path: string): string {
  if (!base) return path
  if (isAbsoluteUrl(path)) return path

  const normalizedBase = base.endsWith("/")
    ? base.slice(0, -1)
    : base
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`

  // Avoid duplicated path segments when BASE_URL already contains
  // part of the endpoint path (e.g. /lead/{channelId} + /lead/{channelId}/{funnelId}).
  const maxOverlap = Math.min(
    normalizedBase.length,
    normalizedPath.length
  )
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (
      normalizedBase.endsWith(
        normalizedPath.slice(0, overlap)
      )
    ) {
      return normalizedBase + normalizedPath.slice(overlap)
    }
  }

  return normalizedBase + normalizedPath
}

function resolveApiUrl(path: string): string {
  return joinBaseAndPath(BASE_URL, path)
}

function redactAuthorizationHeader(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }

  const bearerPrefix = /^Bearer\s+/i
  if (!bearerPrefix.test(trimmed)) {
    return trimmed
  }

  const token = trimmed.replace(bearerPrefix, "")
  if (token.length <= 12) {
    return "Bearer [redacted]"
  }

  return `Bearer ${token.slice(0, 8)}...[redacted]...${token.slice(-4)}`
}

function toDebugHeaders(
  headers: HeadersInit | undefined
): Record<string, string> {
  const normalized = new Headers(headers)
  const entries = Object.fromEntries(normalized.entries())

  if (entries.Authorization) {
    entries.Authorization = redactAuthorizationHeader(
      entries.Authorization
    )
  }

  return entries
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
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const requestUrl = resolveApiUrl(path)
  const shouldDebugLeadRequest =
    import.meta.env.DEV && path.startsWith("/lead/")
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }
  const requestMethod = options.method ?? "GET"

  if (shouldDebugLeadRequest) {
    console.groupCollapsed(
      `[LeadAPI request] ${requestMethod} ${path}`
    )
    console.debug("baseUrl", BASE_URL)
    console.debug("requestUrl", requestUrl)
    console.debug("method", requestMethod)
    console.debug("headers", toDebugHeaders(requestHeaders))
    console.debug("body", options.body ?? null)
    console.groupEnd()
  }

  const res = await fetch(requestUrl, {
    ...options,
    headers: requestHeaders,
  })

  let debugResponseText: string | null = null
  if (shouldDebugLeadRequest) {
    debugResponseText = await res.clone().text()
    console.groupCollapsed(
      `[LeadAPI response] ${requestMethod} ${path}`
    )
    console.debug("status", res.status)
    console.debug("ok", res.ok)
    console.debug(
      "headers",
      Object.fromEntries(res.headers.entries())
    )
    console.debug("rawBody", debugResponseText || null)
    console.groupEnd()
  }

  if (!res.ok) {
    const text = await res.text()
    if (res.status === 401) {
      clearAuthState()
      if (window.location.pathname !== "/login") {
        window.location.replace("/login")
      }
    }
    throw new ApiError(
      res.status,
      parseErrorMessage(text) ??
        defaultErrorMessage(res.status),
      text
    )
  }

  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const parsed = await res.json()
    if (shouldDebugLeadRequest) {
      console.debug(
        `[LeadAPI parsed json] ${requestMethod} ${path}`,
        parsed
      )
    }
    return parsed
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

export const DashboardAPI = {
  get: (channelId: string) =>
    api<DashboardResponse>(
      "/internal/channels/" + channelId + "/dashboard"
    ),
}


/* -------- Auth -------- */

export const AuthAPI = {
  login: (email: string, password: string) =>
    api<{
      userId: string
      globalRole: string
      token?: string | null
      adminToken?: string | null
      memberships?: {
        membershipId: string
        role?: string
        channel?: {
          id: string
          name: string
        }
        channelId?: string
      }[] | null
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  selectMembership: (
    userId: string,
    membershipId: string
  ) =>
    api<{ token: string }>("/auth/select-membership", {
      method: "POST",
      body: JSON.stringify({
        userId,
        membershipId,
      }),
    }),

  // Session check used at app bootstrap. If API is unreachable or auth is invalid,
  // we treat the session as invalid and force logout.
  validateSession: async () => {
    const token = getToken()
    if (!token) return false

    try {
      const res = await fetch(
        resolveApiUrl("/internal/channels"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!res.ok) {
        clearAuthState()
        return false
      }

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
      `/lead/${channelId}/my-leads`
    )
    const normalized = normalizeLeadListResponse(raw)

    if (import.meta.env.DEV) {
      console.debug("[LeadAPI myLeads] raw + normalized", {
        channelId,
        raw,
        normalizedCount: normalized.length,
      })
    }

    return normalized
  },

  list: async (channelId: string, funnelId: string) => {
    const raw = await api<unknown>(`/lead/${channelId}/${funnelId}`)
    const normalized = normalizeLeadListResponse(raw)

    if (import.meta.env.DEV) {
      console.debug("[LeadAPI list] raw + normalized", {
        channelId,
        funnelId,
        raw,
        normalizedCount: normalized.length,
        firstLeadId: normalized[0]?.id ?? null,
        firstLeadBackendId: normalized[0]?.backendId ?? null,
        firstLead: normalized[0]?.raw ?? null,
      })
      if (normalized.length === 0) {
        console.warn(
          "[LeadAPI list] No leads after normalization. Check response shape.",
          {
            channelId,
            funnelId,
            raw,
          }
        )
      }
    }

    return normalized
  },

  create: (
    channelId: string,
    payload: CreateLeadPayload
  ) =>
    api<void | Lead>(`/lead/${channelId}/create`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  assign: (
    channelId: string,
    payload: AssignLeadsPayload
  ) =>
    api<AssignLeadsResponse | void>(
      `/lead/${channelId}/assign`,
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
      `/lead/${channelId}/moveStage`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
}
