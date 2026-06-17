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
      isAdmin: () => get().user?.role === 'admin',
    }),
    { name: 'xylofence-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
