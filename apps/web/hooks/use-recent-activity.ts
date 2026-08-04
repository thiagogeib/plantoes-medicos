'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { ActivityEvent, ApiResponse } from '@plantoes-medicos/types'

export function useRecentActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<ApiResponse<ActivityEvent[]>>('/admin/activity')
      .then((res) => setEvents(res.data))
      .catch(() => toast.error('Erro ao carregar atividade recente'))
      .finally(() => setLoading(false))
  }, [])

  return { events, loading }
}
