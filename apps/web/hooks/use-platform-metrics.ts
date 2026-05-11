'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { PlatformMetrics, ApiResponse } from '@plantoes-medicos/types'

export function usePlatformMetrics() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<ApiResponse<PlatformMetrics>>('/admin/metrics')
      .then((res) => setMetrics(res.data))
      .catch(() => toast.error('Erro ao carregar métricas'))
      .finally(() => setLoading(false))
  }, [])

  return { metrics, loading }
}
