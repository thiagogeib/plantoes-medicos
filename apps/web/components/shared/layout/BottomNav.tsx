'use client'

import { type FC, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@plantoes-medicos/types'
import { navByRole, bottomNavPrimaryCount } from './nav-config'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'

interface BottomNavProps {
  role: UserRole
}

export const BottomNav: FC<BottomNavProps> = ({ role }) => {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const items = navByRole[role] ?? []
  const primaryCount = bottomNavPrimaryCount[role] ?? 3
  const primaryItems = items.slice(0, primaryCount)
  const restItems = items.slice(primaryCount)

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const restHasActive = restItems.some((item) => isItemActive(item.href))

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-around h-16">
          {primaryItems.map((item) => {
            const Icon = item.icon
            const isActive = isItemActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          {restItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="Mais opções do menu"
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                restHasActive ? 'text-indigo-600' : 'text-slate-500'
              )}
            >
              <Menu className="h-5 w-5" />
              <span>Mais</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Mais opções</SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-2 grid grid-cols-3 gap-2">
            {restItems.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.href)
              return (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg px-2 py-4 text-center text-xs font-medium transition-colors',
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </SheetClose>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
