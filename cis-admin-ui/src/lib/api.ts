// src/lib/api.ts

import type { Channel } from "../types/channel"
import { getToken } from "./auth"

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
    api<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
}



