// src/lib/api.ts

import type { Channel } from "../types/channel"
import { clearAuthState, getToken } from "./auth"

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

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

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

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
    return res.json()
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


/* -------- Auth -------- */

export const AuthAPI = {
  login: (email: string) =>
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
      body: JSON.stringify({ email }),
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
      const res = await fetch(`${BASE_URL}/internal/channels`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

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
      `/internal/channels/${channelId}/members/updatePermissionSet`,
      {
        method: "POST",
        body: JSON.stringify({
          memberId,
          permissionSetId,
        }),
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
    console.log("[PermissionAPI] atoms raw:", raw)
    console.log("[PermissionAPI] atoms normalized:", normalized)
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
