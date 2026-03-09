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
import Login from "./pages/Login"
import ChannelView from "./pages/ChannelView"
import FunnelView from "./pages/FunnelView"
import ChannelFunnels from "./pages/ChannelFunnels"
import ChannelLayout from "./layout/ChannelLayout"
import CreateFunnel from "./pages/CreateFunnel"
import Profile from "./pages/Profile"
import ChannelSettings from "./pages/ChannelSettings"
import LeadDetail from "./pages/LeadDetail"
import MyLeads from "./pages/MyLeads"
import {
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
            <Route path="/profile" element={<Profile />} />

            {/* Channel scoped */}
            <Route
              path="/channels/:channelId"
              element={<ChannelLayout />}
            >
              <Route index element={<ChannelView />} />
              <Route
                path="funnels"
                element={<ChannelFunnels />}
              />
              <Route
                path="funnels/new"
                element={<CreateFunnel />}
              />
              <Route
                path="funnels/:id"
                element={<FunnelView />}
              />
              <Route
                path="funnels/:id/leads/:leadId"
                element={<LeadDetail />}
              />
              <Route
                path="my-leads"
                element={<MyLeads />}
              />
              <Route
                path="members"
                element={<Members />}
              />
              <Route
                path="settings"
                element={<ChannelSettings />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
