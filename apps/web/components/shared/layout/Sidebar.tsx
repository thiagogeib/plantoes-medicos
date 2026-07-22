'use client'

import { type FC, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  History,
  Search,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Repeat,
  CalendarOff,
  ClipboardList,
  Building2,
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
    { label: 'Minha Equipe', href: '/hospital/equipe', icon: Users },
    { label: 'Trocas', href: '/hospital/trocas', icon: Repeat },
    { label: 'Folgas', href: '/hospital/folgas', icon: CalendarOff },
    { label: 'Status do Dia', href: '/hospital/escala-do-dia', icon: ClipboardList },
    { label: 'Histórico', href: '/hospital/historico', icon: History },
  ],
  PROFESSIONAL: [
    { label: 'Dashboard', href: '/profissional/dashboard', icon: LayoutDashboard },
    { label: 'Buscar Plantões', href: '/profissional/plantoes', icon: Search },
    { label: 'Minhas Candidaturas', href: '/profissional/candidaturas', icon: FileText },
    { label: 'Meus Hospitais', href: '/profissional/hospitais', icon: Building2 },
    { label: 'Trocas', href: '/profissional/trocas', icon: Repeat },
    { label: 'Folgas', href: '/profissional/folgas', icon: CalendarOff },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Usuários', href: '/admin/usuarios', icon: Users },
    { label: 'Plantões', href: '/admin/plantoes', icon: Calendar },
  ],
}

interface SidebarProps {
  role: UserRole
}

export const Sidebar: FC<SidebarProps> = ({ role }) => {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const items = navByRole[role] ?? []

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-slate-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 text-sm">PlantoesMed</span>
          </div>
        )}
        {collapsed && <Stethoscope className="h-6 w-6 text-blue-600 mx-auto" />}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
