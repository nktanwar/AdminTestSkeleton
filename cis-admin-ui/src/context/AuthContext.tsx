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
  clearToken,
  isLoggedIn,
  onAuthChange,
  setToken,
} from "../lib/auth"
import {
  getActorFromToken,
  type DecodedActor,
} from "../lib/jwt"

type AuthStatus =
  | "checking"
  | "authenticated"
  | "unauthenticated"

interface AuthContextValue {
  status: AuthStatus
  actor: DecodedActor | null
  login: (email: string) => Promise<void>
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

  const refreshSession = useCallback(async () => {
    if (!isLoggedIn()) {
      setActor(null)
      setStatus("unauthenticated")
      return false
    }

    const sessionOk = await AuthAPI.validateSession()
    if (!sessionOk) {
      setActor(null)
      setStatus("unauthenticated")
      return false
    }

    setActor(getActorFromToken())
    setStatus("authenticated")
    return true
  }, [])

  const login = useCallback(
    async (email: string) => {
      const res = await AuthAPI.login(email.trim())
      setToken(res.token)
      const ok = await refreshSession()
      if (!ok) {
        throw new Error(
          "Login failed: session validation failed."
        )
      }
    },
    [refreshSession]
  )

  const logout = useCallback(() => {
    clearToken()
    setActor(null)
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
      login,
      logout,
      refreshSession,
    }),
    [status, actor, login, logout, refreshSession]
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
