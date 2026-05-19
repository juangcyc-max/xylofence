import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ServersPage } from '@/pages/vpn/ServersPage'
import { PeersPage } from '@/pages/vpn/PeersPage'
import { UsersPage } from '@/pages/vpn/UsersPage'
import { AuditPage } from '@/pages/vpn/AuditPage'
import { CloudVpnPage } from '@/pages/vpn/CloudVpnPage'
import { AssetsPage } from '@/pages/security/AssetsPage'
import { ScansPage } from '@/pages/security/ScansPage'
import { IncidentsPage } from '@/pages/security/IncidentsPage'
import { HostScansPage } from '@/pages/security/HostScansPage'
import { MyPage } from '@/pages/MyPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { useAuthStore } from '@/store/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function DefaultRedirect() {
  const { isClient } = useAuthStore()
  return <Navigate to={isClient() ? '/my' : '/dashboard'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/:token" element={<RegisterPage />} />

          {/* Protected — wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="dashboard"               element={<DashboardPage />} />
            <Route path="my"                      element={<MyPage />} />
            <Route path="vpn/servers"             element={<ServersPage />} />
            <Route path="vpn/peers"               element={<PeersPage />} />
            <Route path="vpn/users"               element={<UsersPage />} />
            <Route path="vpn/audit"               element={<AuditPage />} />
            <Route path="vpn/cloud"               element={<CloudVpnPage />} />
            <Route path="security/assets"         element={<AssetsPage />} />
            <Route path="security/scans"          element={<ScansPage />} />
            <Route path="security/incidents"      element={<IncidentsPage />} />
            <Route path="security/host-scans"     element={<HostScansPage />} />
            <Route path="*"                       element={<DefaultRedirect />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
