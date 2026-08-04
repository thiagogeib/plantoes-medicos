'use client'

import { type FC } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NotificationBell } from './NotificationBell'
import type { UserRole } from '@plantoes-medicos/types'

const roleLabels: Record<UserRole, string> = {
  HOSPITAL: 'Hospital',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Admin',
}

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'success'> = {
  HOSPITAL: 'default',
  PROFESSIONAL: 'success',
  ADMIN: 'secondary',
}

export const Header: FC = () => {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {})
    } catch {
      // segue o logout local mesmo se a chamada falhar — sessão expira sozinha
    }
    clearAuth()
    router.push('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'PM'

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6">
      <div className="md:hidden font-bold text-slate-900 text-sm">PlantoesMed</div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <NotificationBell />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-slate-900 leading-none">{user?.email}</span>
          {user?.role && (
            <Badge
              variant={roleBadgeVariant[user.role]}
              className="mt-1 text-xs px-1.5 py-0"
            >
              {roleLabels[user.role]}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
        </Button>
      </div>
    </header>
  )
}
