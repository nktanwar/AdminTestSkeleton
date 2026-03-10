function hasAnyPermission(
  currentPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((permission) =>
    currentPermissions.includes(permission)
  )
}

const FUNNEL_VIEW_PERMISSIONS = [
  "VIEW_FUNNEL",
  "FUNNEL_VIEW",
  "READ_FUNNEL",
  "LIST_FUNNEL",
  "CREATE_FUNNEL",
  "CLOSE_FUNNEL",
  "TRANSFER_WORK",
]

const LEAD_VIEW_PERMISSIONS = [
  "VIEW_LEAD",
  "LEAD_VIEW",
  "READ_LEAD",
  "LIST_LEAD",
  "VIEW_ASSIGNED_LEADS",
  "LIST_ASSIGNED_LEADS",
  "CREATE_LEAD",
  "LEAD_CREATE",
  "CREATE_CHANNEL_LEAD",
  "CREATE_FUNNEL_LEAD",
  "ASSIGN_LEAD",
  "LEAD_ASSIGN",
  "TRANSFER_LEAD",
  "UPDATE_LEAD_OWNER",
]

export function canViewFunnels(
  isAdmin: boolean,
  permissions: string[]
): boolean {
  if (isAdmin || permissions.includes("ADMIN_OVERRIDE")) {
    return true
  }

  return hasAnyPermission(
    permissions,
    FUNNEL_VIEW_PERMISSIONS
  )
}

export function canViewLeads(
  isAdmin: boolean,
  permissions: string[]
): boolean {
  if (canViewFunnels(isAdmin, permissions)) {
    return true
  }

  return hasAnyPermission(permissions, LEAD_VIEW_PERMISSIONS)
}

