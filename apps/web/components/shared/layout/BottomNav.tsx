'use client'

import { type FC } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  History,
  Search,
  FileText,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@plantoes-medicos/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navByRole: Record<UserRole, NavItem[]> = {
  HOSPITAL: [
    { label: 'Dashboard', href: '/hospital/dashboard', icon: LayoutDashboard },
    { label: 'Plantões', href: '/hospital/plantoes', icon: Calendar },
    { label: 'Histórico', href: '/hospital/historico', icon: History },
  ],
  PROFESSIONAL: [
    { label: 'Dashboard', href: '/profissional/dashboard', icon: LayoutDashboard },
    { label: 'Buscar', href: '/profissional/plantoes', icon: Search },
    { label: 'Candidaturas', href: '/profissional/candidaturas', icon: FileText },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Usuários', href: '/admin/usuarios', icon: Users },
    { label: 'Plantões', href: '/admin/plantoes', icon: Calendar },
  ],
}

interface BottomNavProps {
  role: UserRole
}

export const BottomNav: FC<BottomNavProps> = ({ role }) => {
  const pathname = usePathname()
  const items = navByRole[role] ?? []

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-slate-500'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
