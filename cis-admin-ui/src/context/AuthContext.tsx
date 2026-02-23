import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { AuthAPI } from "../lib/api"
import {
  clearAuthState,
  getMemberships,
  getSelectedChannelId,
  getSelectedMembershipId,
  getUserId,
  isLoggedIn,
  onAuthChange,
  setPendingAuthSession,
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
  memberships: {
    membershipId: string
    channelId: string
  }[]
  selectedMembershipId: string | null
  selectedChannelId: string | null
  permissions: string[]
  login: (email: string) => Promise<void>
  selectMembership: (membershipId: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [status, setStatus] = useState<AuthStatus>("checking")
  const [actor, setActor] = useState<DecodedActor | null>(
    null
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<
    { membershipId: string; channelId: string }[]
  >([])
  const [selectedMembershipId, setSelectedMembershipId] =
    useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<
    string | null
  >(null)
  const [permissions, setPermissions] = useState<string[]>([])

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

      if (
        pendingUserId &&
        pendingMemberships.length > 0
      ) {
        setStatus("membership-selection")
        return false
      }

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
      setPermissions([])
      setStatus("unauthenticated")
      return false
    }

    const nextActor = getActorFromToken()
    setActor(nextActor)
    setPermissions(nextActor?.permissionCodes ?? [])
    setUserId(nextActor?.sub ?? getUserId())

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
          ? [{ membershipId, channelId }]
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
      const res = await AuthAPI.login(email.trim())
      setPendingAuthSession(res.userId, res.memberships)
      setUserId(res.userId)
      setMemberships(res.memberships)
      setSelectedMembershipId(null)
      setSelectedChannelId(null)
      setPermissions([])
      setActor(null)
      setStatus("membership-selection")
    },
    []
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
        membership.channelId
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

  const logout = useCallback(() => {
    clearAuthState()
    setActor(null)
    setUserId(null)
    setMemberships([])
    setSelectedMembershipId(null)
    setSelectedChannelId(null)
    setPermissions([])
    setStatus("unauthenticated")
  }, [])

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
      permissions,
      login,
      selectMembership,
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
      permissions,
      login,
      selectMembership,
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
