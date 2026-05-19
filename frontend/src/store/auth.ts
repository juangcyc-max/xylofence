import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
  isAdmin: () => boolean
  isManager: () => boolean
  isViewer: () => boolean
  isClient: () => boolean
  canWrite: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('xylofence_token', token)
        set({ token, user })
      },
      logout: () => {
        localStorage.removeItem('xylofence_token')
        set({ token: null, user: null })
      },
      isAdmin:   () => get().user?.role === 'admin',
      isManager: () => ['admin', 'manager'].includes(get().user?.role ?? ''),
      isViewer:  () => get().user?.role === 'viewer',
      isClient:  () => get().user?.role === 'client',
      canWrite:  () => ['admin', 'manager'].includes(get().user?.role ?? ''),
    }),
    { name: 'xylofence-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
