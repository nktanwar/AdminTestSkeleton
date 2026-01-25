import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "./layout/AppLayout"

import Dashboard from "./pages/Dashboard"
import Channels from "./pages/Channels"
import Members from "./pages/Members"
import PermissionSets from "./pages/PermissionSets"
import DemoSwitch from "./pages/DemoSwitch"

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/members" element={<Members />} />
          <Route path="/permissions" element={<PermissionSets />} />
          <Route path="/demo" element={<DemoSwitch />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
