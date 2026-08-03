import {
  LayoutDashboard,
  Calendar,
  History,
  Search,
  FileText,
  Users,
  Stethoscope,
  Repeat,
  CalendarOff,
  ClipboardList,
  Building2,
  UserCircle,
  Settings,
} from 'lucide-react'
import type { UserRole } from '@plantoes-medicos/types'

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

export const navByRole: Record<UserRole, NavItem[]> = {
  HOSPITAL: [
    { label: 'Dashboard', href: '/hospital/dashboard', icon: LayoutDashboard },
    { label: 'Plantões', href: '/hospital/plantoes', icon: Calendar },
    { label: 'Minha Equipe', href: '/hospital/equipe', icon: Users },
    { label: 'Trocas', href: '/hospital/trocas', icon: Repeat },
    { label: 'Folgas', href: '/hospital/folgas', icon: CalendarOff },
    { label: 'Status do Dia', href: '/hospital/escala-do-dia', icon: ClipboardList },
    { label: 'Histórico', href: '/hospital/historico', icon: History },
    { label: 'Meu Perfil', href: '/hospital/perfil', icon: UserCircle },
    { label: 'Configurações', href: '/hospital/configuracoes', icon: Settings },
  ],
  PROFESSIONAL: [
    { label: 'Dashboard', href: '/profissional/dashboard', icon: LayoutDashboard },
    { label: 'Buscar Plantões', href: '/profissional/plantoes', icon: Search },
    { label: 'Minhas Candidaturas', href: '/profissional/candidaturas', icon: FileText },
    { label: 'Meus Hospitais', href: '/profissional/hospitais', icon: Building2 },
    { label: 'Trocas', href: '/profissional/trocas', icon: Repeat },
    { label: 'Folgas', href: '/profissional/folgas', icon: CalendarOff },
    { label: 'Meu Perfil', href: '/profissional/perfil', icon: UserCircle },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Usuários', href: '/admin/usuarios', icon: Users },
    { label: 'Plantões', href: '/admin/plantoes', icon: Calendar },
  ],
}

// Primeiros itens que aparecem direto na barra inferior mobile; o resto vai no menu "Mais".
export const bottomNavPrimaryCount: Record<UserRole, number> = {
  HOSPITAL: 3,
  PROFESSIONAL: 3,
  ADMIN: 3,
}

export { Stethoscope }
