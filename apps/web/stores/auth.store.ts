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

function setCookieToken(token: string) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `accessToken=${token}; path=/; max-age=900; SameSite=Lax${secure}`
}

function clearCookieToken() {
  if (typeof document === 'undefined') return
  document.cookie = 'accessToken=; path=/; max-age=0'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (token, user) => {
        setCookieToken(token)
        set({ accessToken: token, user })
      },
      clearAuth: () => {
        clearCookieToken()
        set({ accessToken: null, user: null })
      },
    }),
    {
      name: 'plantoes-auth',
    }
  )
)
