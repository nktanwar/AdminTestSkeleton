// src/lib/api.ts

import type { Channel } from "../types/channel"
import { clearAuthState, getToken } from "./auth"

const BASE_URL = "http://localhost:8082"

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
    if (res.status === 401) {
      clearAuthState()
      if (window.location.pathname !== "/login") {
        window.location.replace("/login")
      }
    }
    const text = await res.text()
    throw new Error(text || "API error")
  }

  return res.json()
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

}


/* -------- Auth -------- */

export const AuthAPI = {
  login: (email: string) =>
    api<{
      userId: string
      memberships: {
        membershipId: string
        channelId: string
      }[]
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
  level: string
  permissionSet: string
  status: "ACTIVE" | "DEACTIVATED"
}

export const ChannelMemberAPI = {
  list: (channelId: string) =>
    api<ChannelMember[]>(`/api/channels/${channelId}/members`),

  add: (
    channelId: string,
    payload: {
      name: string
      email: string
      phone: string
      levelId: string
    }
  ) =>
    api<ChannelMember>(`/api/channels/${channelId}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
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

export const PermissionAPI = {
  listPermissions: () =>
    api<string[]>("/api/permissions"),

  listSets: (channelId: string) =>
    api<PermissionSet[]>(
      `/internal/channels/${channelId}/permission-sets`
    ),

  createSet: (channelId: string, name: string) =>
    api<PermissionSet>(
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
    api<PermissionSet>(
      `/internal/channels/${channelId}/permission-sets/${id}`,
      {
      method: "PUT",
      body: JSON.stringify({ permissions }),
      }
    ),
}


/* -------- Funnels (UI) -------- */

export interface FunnelUi {
  id: string
  stage: string

  channelId: string
  channelName: string

  ownerMemberId: string
  ownerName: string

  customerName: string
  customerPhone: string
  customerEmail?: string | null
}

// export const FunnelAPI = {
//   listUi: () =>
//     api<FunnelUi[]>("/internal/funnels/ui"),

//   getUi: (id: string) =>
//     api<FunnelUi>(`/internal/funnels/ui/${id}`),
// }


/* -------- Funnels (UI) -------- */

export interface CreateFunnelPayload {
  channelId: string
  ownerMemberId: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  source: "ADMIN"
}

export interface FunnelSummary {
  id: string
  stage: string
  ownerMemberId: string
  channelId: string
  channelName?: string
}

export const FunnelAPI = {
  list: () =>
    api<FunnelSummary[]>("/internal/funnels/ui"),

  create: (payload: CreateFunnelPayload) =>
    api("/internal/funnels", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getUi: (id: string) =>
    api<FunnelUi>(`/internal/funnels/${id}/ui`),
}
