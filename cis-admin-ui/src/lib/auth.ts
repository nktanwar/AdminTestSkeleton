// src/lib/auth.ts

const TOKEN_KEY = "cis_token"
const USER_ID_KEY = "cis_user_id"
const MEMBERSHIPS_KEY = "cis_memberships"
const SELECTED_MEMBERSHIP_ID_KEY = "cis_selected_membership_id"
const SELECTED_CHANNEL_ID_KEY = "cis_selected_channel_id"
const AUTH_EVENT = "cis-auth-changed"

interface JwtPayload {
  exp?: number
}

export interface AuthMembership {
  membershipId: string
  channel: {
    id: string
    name?: string
  }
  role?: string
}

function decodePayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token)
  if (!payload?.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function setPendingAuthSession(
  userId: string,
  memberships: AuthMembership[]
) {
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(
    MEMBERSHIPS_KEY,
    JSON.stringify(memberships)
  )
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}

export function getMemberships(): AuthMembership[] {
  const raw = localStorage.getItem(MEMBERSHIPS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((x): AuthMembership[] => {
      if (!x || typeof x !== "object") return []
      const membershipId = (x as { membershipId?: unknown })
        .membershipId
      const channel = (x as { channel?: unknown }).channel
      const legacyChannelId = (x as { channelId?: unknown })
        .channelId
      const role = (x as { role?: unknown }).role

      if (typeof membershipId !== "string") return []

      if (
        channel &&
        typeof channel === "object" &&
        typeof (channel as { id?: unknown }).id === "string"
      ) {
        const channelName = (channel as { name?: unknown }).name
        return [
          {
            membershipId,
            channel: {
              id: (channel as { id: string }).id,
              ...(typeof channelName === "string"
                ? { name: channelName }
                : {}),
            },
            ...(typeof role === "string" ? { role } : {}),
          },
        ]
      }

      if (typeof legacyChannelId === "string") {
        return [
          {
            membershipId,
            channel: { id: legacyChannelId },
            ...(typeof role === "string" ? { role } : {}),
          },
        ]
      }

      return []
    })
  } catch {
    return []
  }
}

export function setSelectedMembershipContext(
  membershipId: string,
  channelId: string
) {
  localStorage.setItem(
    SELECTED_MEMBERSHIP_ID_KEY,
    membershipId
  )
  localStorage.setItem(SELECTED_CHANNEL_ID_KEY, channelId)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function setSelectedChannelContext(channelId: string) {
  localStorage.removeItem(SELECTED_MEMBERSHIP_ID_KEY)
  localStorage.setItem(SELECTED_CHANNEL_ID_KEY, channelId)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function getSelectedMembershipId(): string | null {
  return localStorage.getItem(SELECTED_MEMBERSHIP_ID_KEY)
}

export function getSelectedChannelId(): string | null {
  return localStorage.getItem(SELECTED_CHANNEL_ID_KEY)
}

export function clearAuthState() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(MEMBERSHIPS_KEY)
  localStorage.removeItem(SELECTED_MEMBERSHIP_ID_KEY)
  localStorage.removeItem(SELECTED_CHANNEL_ID_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function isLoggedIn(): boolean {
  const token = getToken()
  if (!token) return false

  if (isTokenExpired(token)) {
    clearToken()
    return false
  }

  return true
}

export function onAuthChange(handler: () => void) {
  window.addEventListener(AUTH_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(AUTH_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}
