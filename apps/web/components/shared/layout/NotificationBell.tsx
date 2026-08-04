'use client'

import { type FC, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Notification } from '@plantoes-medicos/types'

const POLL_INTERVAL_MS = 30_000

export const NotificationBell: FC = () => {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: Notification[]; unreadCount: number }>(
        '/notifications'
      )
      setNotifications(res.data)
      setUnreadCount(res.unreadCount)
    } catch {
      // silencioso — sino não deve quebrar o resto da tela
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  async function handleSelect(notification: Notification) {
    if (!notification.read) {
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
      apiClient.patch(`/notifications/${notification.id}/read`, {}).catch(() => {})
    }
    if (notification.link) router.push(notification.link)
  }

  async function handleMarkAllRead() {
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    apiClient.patch('/notifications/read-all', {}).catch(() => {})
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4 text-slate-500" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold text-slate-900">Notificações</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-slate-400">
            Nenhuma notificação ainda.
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onSelect={() => handleSelect(notification)}
              className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                {!notification.read && (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                )}
                <span
                  className={
                    notification.read
                      ? 'text-sm text-slate-600'
                      : 'text-sm font-semibold text-slate-900'
                  }
                >
                  {notification.title}
                </span>
              </div>
              <span className="text-xs text-slate-500 pl-3.5">{notification.message}</span>
              <span className="text-[11px] text-slate-400 pl-3.5">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
