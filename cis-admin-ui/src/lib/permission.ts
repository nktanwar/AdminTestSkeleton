// src/lib/permissions.ts
import { getActorFromToken } from "./jwt"

export function usePermissions() {
  const actor = getActorFromToken()
  const isAdmin =
    actor?.permissionCodes?.includes("ADMIN_OVERRIDE") ??
    false

  function has(permission: string): boolean {
    if (!actor) return false
    if (isAdmin) return true

    return actor.permissionCodes?.includes(permission) ?? false
  }

  return {
    actor,
    isAdmin,
    has,
  }
}
