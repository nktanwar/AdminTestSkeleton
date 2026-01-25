import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "./layout/AppLayout"

import Dashboard from "./pages/Dashboard"
import Channels from "./pages/Channels"
import Members from "./pages/Members"
import PermissionSets from "./pages/PermissionSets"
import DemoSwitch from "./pages/DemoSwitch"
import { useState } from "react"
import { isLoggedIn } from "./lib/auth"
import Login from "./pages/Login"
import ChannelView from "./pages/ChannelView"

export default function App() {
   const [loggedIn, setLoggedIn] = useState(isLoggedIn())

  if (!loggedIn) {
    return <Login onSuccess={() => setLoggedIn(true)} />
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/members" element={<Members />} />
          <Route path="/permissions" element={<PermissionSets />} />
          <Route path="/demo" element={<DemoSwitch />} />
          <Route path="/channels/:id" element={<ChannelView/>} />

        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
