import {
  useQuery,
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
import {
  AuthAPI,
  ChannelAPI,
  type ChannelCapabilities,
  type ChannelMe,
} from "../lib/api"
import {
  type AuthMembership,
  clearAuthState,
  getMemberships,
  getSelectedChannelId,
  getSelectedMembershipId,
  getUserId,
  isLoggedIn,
  onAuthChange,
  setPendingAuthSession,
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
  globalRole: "ADMIN" | "USER" | null
  isAdmin: boolean
  permissions: string[]
  channelMe: ChannelMe | null
  capabilities: ChannelCapabilities
  capabilitiesLoading: boolean
  login: (email: string) => Promise<void>
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

function normalizeGlobalRole(
  value: string | null | undefined
): "ADMIN" | "USER" | null {
  if (value === "ADMIN" || value === "USER") {
    return value
  }
  return null
}

function resolveRoleFromActor(
  actor: DecodedActor | null
): "ADMIN" | "USER" | null {
  if (!actor) return null

  const claimRole = normalizeGlobalRole(
    typeof actor.globalRole === "string"
      ? actor.globalRole
      : null
  )
  if (claimRole) return claimRole

  if (actor.isAdmin === true) return "ADMIN"
  if (actor.type === "ADMIN") return "ADMIN"

  return "USER"
}

function normalizeMemberships(
  memberships:
    | {
    membershipId: string
    channel?: {
      id: string
      name: string
    }
    channelId?: string
    role?: string
  }[]
    | null
    | undefined
): AuthMembership[] {
  if (!Array.isArray(memberships)) return []

  return memberships.flatMap((membership) => {
    if (membership.channel?.id) {
      return [
        {
          membershipId: membership.membershipId,
          channel: {
            id: membership.channel.id,
            name: membership.channel.name,
          },
          role: membership.role,
        },
      ]
    }

    if (membership.channelId) {
      return [
        {
          membershipId: membership.membershipId,
          channel: { id: membership.channelId },
          role: membership.role,
        },
      ]
    }

    return []
  })
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
    "ADMIN" | "USER" | null
  >(null)
  const [permissions, setPermissions] = useState<string[]>([])

  const actorRole = resolveRoleFromActor(actor)
  const tokenIsAdmin =
    actorRole === "ADMIN" || globalRole === "ADMIN"

  const channelMeQuery = useQuery({
    queryKey: ["channelMe", selectedChannelId],
    queryFn: () => ChannelAPI.me(selectedChannelId!),
    enabled:
      status === "authenticated" &&
      !!selectedChannelId &&
      !tokenIsAdmin,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  const effectiveCapabilities: ChannelCapabilities = tokenIsAdmin
    ? FULL_CAPABILITIES
    : channelMeQuery.data?.isAdmin
      ? FULL_CAPABILITIES
      : channelMeQuery.data?.capabilities ??
        EMPTY_CAPABILITIES

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
    if (import.meta.env.DEV) {
      console.log("[Auth] Current JWT payload:", nextActor)
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
    if (nextActor?.sub) {
      setPendingAuthSession(
        nextActor.sub,
        effectiveMemberships
      )
    }

    setSelectedMembershipId(membershipId)
    setSelectedChannelId(channelId)
    setStatus("authenticated")
    return true
  }, [])

  const login = useCallback(
    async (email: string) => {
      // Prevent cross-user data bleed from previous query cache.
      queryClient.clear()

      const res = await AuthAPI.login(email.trim())
      const normalizedMemberships = normalizeMemberships(
        res.memberships
      )
      setPendingAuthSession(res.userId, normalizedMemberships)
      setUserId(res.userId)
      setMemberships(normalizedMemberships)
      setSelectedMembershipId(null)
      setSelectedChannelId(null)
      const normalizedRole = normalizeGlobalRole(
        res.globalRole
      )
      setGlobalRole(normalizedRole)
      setPermissions([])
      setActor(null)

      const loginToken = res.adminToken ?? res.token ?? null
      if (loginToken) {
        setToken(loginToken)
        const ok = await refreshSession()
        if (!ok) {
          throw new Error("Login failed: session validation failed.")
        }
        return
      }

      if (normalizedMemberships.length === 0) {
        throw new Error("No memberships available for this user.")
      }

      const firstMembership = normalizedMemberships[0]
      const tokenRes = await AuthAPI.selectMembership(
        res.userId,
        firstMembership.membershipId
      )
      setSelectedMembershipContext(
        firstMembership.membershipId,
        firstMembership.channel.id
      )
      setToken(tokenRes.token)
      await refreshSession()
    },
    [queryClient, refreshSession]
  )

  const selectMembership = useCallback(
    async (membershipId: string) => {
      if (!userId) {
        throw new Error(
          "Missing user session. Please login again."
        )
      }

      const membership = memberships.find(
        (m) => m.membershipId === membershipId
      )
      if (!membership) {
        throw new Error("Invalid membership selection.")
      }

      const res = await AuthAPI.selectMembership(
        userId,
        membershipId
      )

      setSelectedMembershipContext(
        membership.membershipId,
        membership.channel.id
      )
      setToken(res.token)

      const ok = await refreshSession()
      if (!ok) {
        throw new Error(
          "Membership selection failed: session validation failed."
        )
      }
    },
    [userId, memberships, refreshSession]
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
    void refreshSession()

    return () => {
      unsubscribe()
      window.clearInterval(interval)
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
      channelMe: channelMeQuery.data ?? null,
      capabilities: effectiveCapabilities,
      capabilitiesLoading:
        !tokenIsAdmin && channelMeQuery.isLoading,
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
      channelMeQuery.data,
      channelMeQuery.isLoading,
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    )
  }
  return ctx
}
