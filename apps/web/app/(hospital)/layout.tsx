import { type ReactNode } from 'react'
import { Sidebar } from '@/components/shared/layout/Sidebar'
import { Header } from '@/components/shared/layout/Header'
import { BottomNav } from '@/components/shared/layout/BottomNav'

export default function HospitalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role="HOSPITAL" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav role="HOSPITAL" />
    </div>
  )
}
