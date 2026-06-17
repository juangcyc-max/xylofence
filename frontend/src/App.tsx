import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ServersPage } from '@/pages/vpn/ServersPage'
import { PeersPage } from '@/pages/vpn/PeersPage'
import { UsersPage } from '@/pages/vpn/UsersPage'
import { AuditPage } from '@/pages/vpn/AuditPage'
import { AssetsPage } from '@/pages/security/AssetsPage'
import { ScansPage } from '@/pages/security/ScansPage'
import { IncidentsPage } from '@/pages/security/IncidentsPage'
import { HostScansPage } from '@/pages/security/HostScansPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vpn/servers"  element={<ServersPage />} />
            <Route path="vpn/peers"    element={<PeersPage />} />
            <Route path="vpn/users"    element={<UsersPage />} />
            <Route path="vpn/audit"    element={<AuditPage />} />
            <Route path="security/assets"    element={<AssetsPage />} />
            <Route path="security/scans"     element={<ScansPage />} />
            <Route path="security/incidents" element={<IncidentsPage />} />
            <Route path="security/host-scans" element={<HostScansPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
