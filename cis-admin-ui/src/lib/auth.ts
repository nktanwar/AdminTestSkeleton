// src/lib/auth.ts

const TOKEN_KEY = "cis_token"
const AUTH_EVENT = "cis-auth-changed"

interface JwtPayload {
  exp?: number
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
