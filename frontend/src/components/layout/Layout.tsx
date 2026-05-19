import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '@/store/auth'

export function Layout() {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F6FB' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ background: '#F4F6FB' }}>
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
