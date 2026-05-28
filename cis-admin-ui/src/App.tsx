import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom"
import AppLayout from "./layout/AppLayout"
import Login from "./pages/Login"
import Profile from "./pages/Profile"
import AdminDashboard from "./pages/AdminDashboard"
import AdminUsers from "./pages/AdminUsers"
import DealerDashboard from "./pages/DealerDashboard"
import DealerChannels from "./pages/DealerChannels"
import DealerKnowledgeCenters from "./pages/DealerKnowledgeCenters"
import DealerLeads from "./pages/DealerLeads"
import DealerLeadDetail from "./pages/DealerLeadDetail"
import Dashboard from "./pages/Dashboard"
import Channels from "./pages/Channels"
import Members from "./pages/Members"
import PermissionSets from "./pages/PermissionSets"
import ChannelView from "./pages/ChannelView"
import FunnelView from "./pages/FunnelView"
import ChannelFunnels from "./pages/ChannelFunnels"
import ChannelLayout from "./layout/ChannelLayout"
import CreateFunnel from "./pages/CreateFunnel"
import ChannelSettings from "./pages/ChannelSettings"
import LeadDetail from "./pages/LeadDetail"
import MyLeads from "./pages/MyLeads"
import { useAuth } from "./context/AuthContext"
import ProtectedRoute from "./routes/ProtectedRoute"

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

function FullPageMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center">
      {message}
    </div>
  )
}

function LoginRoute() {
  const { status, isAdmin } = useAuth()

  if (status === "checking") {
    return <FullPageMessage message="Checking session..." />
  }

  if (status === "authenticated") {
    return (
      <Navigate
        to={isAdmin ? "/admin/dashboard" : "/dealer/dashboard"}
        replace
      />
    )
  }

  return <Login />
}

function HomeRedirect() {
  const { status, isAdmin } = useAuth()

  if (status === "checking") {
    return <FullPageMessage message="Checking session..." />
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />
  }

  return (
    <Navigate
      to={isAdmin ? "/admin/dashboard" : "/dealer/dashboard"}
      replace
    />
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route
              path="/dealer/dashboard"
              element={<DealerDashboard />}
            />
            <Route
              path="/dealer/channels"
              element={<DealerChannels />}
            />
            <Route
              path="/dealer/knowledge-centers"
              element={<DealerKnowledgeCenters />}
            />
            <Route path="/dealer/leads" element={<DealerLeads />} />
            <Route
              path="/dealer/leads/:id"
              element={<DealerLeadDetail />}
            />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route element={<AppShell />}>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/channels" element={<Channels />} />
            <Route
              path="/permissions"
              element={<PermissionSets />}
            />
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
                path="leads/:leadId"
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
    </HashRouter>
  )
}
