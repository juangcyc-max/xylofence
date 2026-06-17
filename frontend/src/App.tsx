import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'

const LoginPage      = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage  = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ServersPage    = lazy(() => import('@/pages/vpn/ServersPage').then(m => ({ default: m.ServersPage })))
const PeersPage      = lazy(() => import('@/pages/vpn/PeersPage').then(m => ({ default: m.PeersPage })))
const UsersPage      = lazy(() => import('@/pages/vpn/UsersPage').then(m => ({ default: m.UsersPage })))
const AuditPage      = lazy(() => import('@/pages/vpn/AuditPage').then(m => ({ default: m.AuditPage })))
const AssetsPage     = lazy(() => import('@/pages/security/AssetsPage').then(m => ({ default: m.AssetsPage })))
const ScansPage      = lazy(() => import('@/pages/security/ScansPage').then(m => ({ default: m.ScansPage })))
const IncidentsPage  = lazy(() => import('@/pages/security/IncidentsPage').then(m => ({ default: m.IncidentsPage })))
const HostScansPage  = lazy(() => import('@/pages/security/HostScansPage').then(m => ({ default: m.HostScansPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function RouteFallback() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
