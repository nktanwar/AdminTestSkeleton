import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({
  requireAdmin = false,
}: {
  requireAdmin?: boolean
}) {
  const { status, isAdmin } = useAuth()

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center">
        Checking session...
      </div>
    )
  }

  if (
    status === "unauthenticated" ||
    status === "membership-selection"
  ) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dealer/dashboard" replace />
  }

  return <Outlet />
}
