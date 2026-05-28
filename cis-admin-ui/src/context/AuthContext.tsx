import {
  useQueryClient,
} from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { AuthAPI, type ChannelCapabilities, type ChannelMe } from "../lib/api"
import {
  type AuthMembership,
  clearAuthState,
  getMemberships,
  getSelectedChannelId,
  getSelectedMembershipId,
  getUserId,
  isLoggedIn,
  onAuthChange,
  setSelectedChannelContext,
  setSelectedMembershipContext,
  setToken,
} from "../lib/auth"
import {
  getActorFromToken,
  type DecodedActor,
} from "../lib/jwt"

type AuthStatus =
  | "checking"
  | "membership-selection"
  | "authenticated"
  | "unauthenticated"

interface AuthContextValue {
  status: AuthStatus
  actor: DecodedActor | null
  userId: string | null
  memberships: AuthMembership[]
  selectedMembershipId: string | null
  selectedChannelId: string | null
  globalRole: "ADMIN" | "STANDARD" | "DEALER" | null
  isAdmin: boolean
  permissions: string[]
  channelMe: ChannelMe | null
  capabilities: ChannelCapabilities
  capabilitiesLoading: boolean
  login: (
    email: string,
    password: string
  ) => Promise<"ADMIN" | "STANDARD" | "DEALER">
  selectMembership: (membershipId: string) => Promise<void>
  selectChannel: (channelId: string) => void
  logout: () => void
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const EMPTY_CAPABILITIES: ChannelCapabilities = {
  canViewMembers: false,
  canAddMember: false,
  canManagePermissions: false,
  canUpdateChannel: false,
}

const FULL_CAPABILITIES: ChannelCapabilities = {
  canViewMembers: true,
  canAddMember: true,
  canManagePermissions: true,
  canUpdateChannel: true,
}

const FALLBACK_AUTH_CONTEXT: AuthContextValue = {
  status: "unauthenticated",
  actor: null,
  userId: null,
  memberships: [],
  selectedMembershipId: null,
  selectedChannelId: null,
  globalRole: null,
  isAdmin: false,
  permissions: [],
  channelMe: null,
  capabilities: EMPTY_CAPABILITIES,
  capabilitiesLoading: false,
  login: async () => "STANDARD",
  selectMembership: async () => {},
  selectChannel: () => {},
  logout: () => {},
  refreshSession: async () => false,
}

function normalizeGlobalRole(
  value: string | null | undefined
): "ADMIN" | "STANDARD" | "DEALER" | null {
  if (
    value === "ADMIN" ||
    value === "STANDARD" ||
    value === "DEALER"
  ) {
    return value
  }
  return null
}

function resolveRoleFromActor(
  actor: DecodedActor | null
): "ADMIN" | "STANDARD" | "DEALER" | null {
  if (!actor) return null

  const claimRole = normalizeGlobalRole(
    typeof actor.globalRole === "string"
      ? actor.globalRole
      : null
  )
  if (claimRole) return claimRole

  if (actor.isAdmin === true) return "ADMIN"
  if (actor.type === "ADMIN") return "ADMIN"

  return "STANDARD"
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>("checking")
  const [actor, setActor] = useState<DecodedActor | null>(
    null
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<
    AuthMembership[]
  >([])
  const [selectedMembershipId, setSelectedMembershipId] =
    useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<
    string | null
  >(null)
  const [globalRole, setGlobalRole] = useState<
    "ADMIN" | "STANDARD" | "DEALER" | null
  >(null)
  const [permissions, setPermissions] = useState<string[]>([])

  const actorRole = resolveRoleFromActor(actor)
  const tokenIsAdmin =
    actorRole === "ADMIN" || globalRole === "ADMIN"

  const effectiveCapabilities: ChannelCapabilities = tokenIsAdmin
    ? FULL_CAPABILITIES
    : EMPTY_CAPABILITIES

  const refreshSession = useCallback(async () => {
    if (!isLoggedIn()) {
      const pendingUserId = getUserId()
      const pendingMemberships = getMemberships()

      setUserId(pendingUserId)
      setMemberships(pendingMemberships)
      setActor(null)
      setPermissions([])
      setSelectedMembershipId(
        getSelectedMembershipId() ?? null
      )
      setSelectedChannelId(getSelectedChannelId() ?? null)
      setGlobalRole(null)

      setActor(null)
      setStatus("unauthenticated")
      return false
    }

    const sessionOk = await AuthAPI.validateSession()
    if (!sessionOk) {
      clearAuthState()
      setActor(null)
      setUserId(null)
      setMemberships([])
      setSelectedMembershipId(null)
      setSelectedChannelId(null)
      setGlobalRole(null)
      setPermissions([])
      setStatus("unauthenticated")
      return false
    }

    const nextActor = getActorFromToken()
    if (!nextActor) {
      clearAuthState()
      setActor(null)
      setUserId(null)
      setMemberships([])
      setSelectedMembershipId(null)
      setSelectedChannelId(null)
      setGlobalRole(null)
      setPermissions([])
      setStatus("unauthenticated")
      return false
    }

    const nextRole = resolveRoleFromActor(nextActor)
    setActor(nextActor)
    setPermissions(nextActor?.permissionCodes ?? [])
    setUserId(nextActor?.sub ?? getUserId())
    setGlobalRole(nextRole)

    const membershipId =
      nextActor?.membershipId ??
      getSelectedMembershipId() ??
      null
    const channelId =
      nextActor?.channelId ?? getSelectedChannelId() ?? null

    const storedMemberships = getMemberships()
    const effectiveMemberships =
      storedMemberships.length > 0
        ? storedMemberships
        : membershipId && channelId
          ? [{ membershipId, channel: { id: channelId } }]
          : []
    setMemberships(effectiveMemberships)

    setSelectedMembershipId(membershipId)
    setSelectedChannelId(channelId)
    setStatus("authenticated")
    return true
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      // Prevent cross-user data bleed from previous query cache.
      queryClient.clear()

      clearAuthState()
      const res = await AuthAPI.login(email.trim(), password)
      setToken(res.token)
      const ok = await refreshSession()
      if (!ok) {
        throw new Error("Login failed: session validation failed.")
      }

      const nextRole =
        resolveRoleFromActor(getActorFromToken()) ?? "STANDARD"
      setUserId(getActorFromToken()?.sub ?? null)
      setMemberships([])
      setSelectedMembershipId(null)
      setSelectedChannelId(null)
      return nextRole
    },
    [queryClient, refreshSession]
  )

  const selectMembership = useCallback(
    async (membershipId: string) => {
      const membership = memberships.find((m) => m.membershipId === membershipId)
      if (!membership) return

      setSelectedMembershipContext(membership.membershipId, membership.channel.id)
      setSelectedMembershipId(membership.membershipId)
      setSelectedChannelId(membership.channel.id)
    },
    [memberships]
  )

  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelContext(channelId)
    if (globalRole === "ADMIN") {
      setSelectedMembershipId(null)
    }
    setSelectedChannelId(channelId)
  }, [globalRole])

  const logout = useCallback(() => {
    queryClient.clear()
    clearAuthState()
    setActor(null)
    setUserId(null)
    setMemberships([])
    setSelectedMembershipId(null)
    setSelectedChannelId(null)
    setGlobalRole(null)
    setPermissions([])
    setStatus("unauthenticated")
  }, [queryClient])

  useEffect(() => {
    const handleAuthChange = () => {
      void refreshSession()
    }

    const unsubscribe = onAuthChange(handleAuthChange)
    const interval = window.setInterval(
      handleAuthChange,
      30_000
    )
    const initialRefresh = window.setTimeout(() => {
      void refreshSession()
    }, 0)

    return () => {
      unsubscribe()
      window.clearInterval(interval)
      window.clearTimeout(initialRefresh)
    }
  }, [refreshSession])

  const value = useMemo(
    () => ({
      status,
      actor,
      userId,
      memberships,
      selectedMembershipId,
      selectedChannelId,
      globalRole,
      isAdmin: tokenIsAdmin,
      permissions,
      channelMe: null,
      capabilities: effectiveCapabilities,
      capabilitiesLoading: false,
      login,
      selectMembership,
      selectChannel,
      logout,
      refreshSession,
    }),
    [
      status,
      actor,
      userId,
      memberships,
      selectedMembershipId,
      selectedChannelId,
      globalRole,
      tokenIsAdmin,
      permissions,
      effectiveCapabilities,
      login,
      selectMembership,
      selectChannel,
      logout,
      refreshSession,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return FALLBACK_AUTH_CONTEXT
  }
  return ctx
}
