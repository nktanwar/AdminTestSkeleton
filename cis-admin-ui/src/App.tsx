import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom"
import AppLayout from "./layout/AppLayout"

import Dashboard from "./pages/Dashboard"
import Channels from "./pages/Channels"
import Members from "./pages/Members"
import PermissionSets from "./pages/PermissionSets"
import DemoSwitch from "./pages/DemoSwitch"
import Login from "./pages/Login"
import ChannelView from "./pages/ChannelView"
import FunnelView from "./pages/FunnelView"
import ChannelLayout from "./layout/ChannelLayout"
import CreateFunnel from "./pages/CreateFunnel"
import Profile from "./pages/Profile"
import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext"
import ProtectedRoute from "./routes/ProtectedRoute"

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

function LoginRoute() {
  const { status } = useAuth()

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center">
        Checking session...
      </div>
    )
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />
  }

  return <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              {/* Global */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/channels" element={<Channels />} />
              <Route
                path="/permissions"
                element={<PermissionSets />}
              />
              <Route path="/demo" element={<DemoSwitch />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/funnels/:id" element={<FunnelView />} />
              <Route
                path="/funnels/new"
                element={<CreateFunnel />}
              />

              {/* Channel scoped */}
              <Route
                path="/channels/:channelId"
                element={<ChannelLayout />}
              >
                <Route index element={<ChannelView />} />
                <Route
                  path="members"
                  element={<Members />}
                />
                <Route
                  path="permissions"
                  element={<PermissionSets />}
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
