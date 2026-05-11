import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole, UserStatus } from '@plantoes-medicos/types'

interface AuthUser {
  id: string
  email: string
  role: UserRole
  status: UserStatus
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (token, user) => set({ accessToken: token, user }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'plantoes-auth',
    }
  )
)
