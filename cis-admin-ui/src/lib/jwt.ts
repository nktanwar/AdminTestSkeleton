// src/lib/jwt.ts
import { getToken } from "./auth"

export interface DecodedActor {
  type: "CHANNEL_MEMBER"
  channelId?: string
  membershipId?: string
  permissionCodes?: string[]
  sub: string
  userTokenVersion?: number
  membershipTokenVersion?: number
}

export function getActorFromToken(): DecodedActor | null {
  const token = getToken()
  if (!token) return null

  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}
