'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Shift, ApiListResponse, ApiResponse } from '@plantoes-medicos/types'

interface HospitalMetrics {
  open: number
  filled: number
  completed: number
}

interface HospitalDashboardData {
  metrics: HospitalMetrics
  recentShifts: Shift[]
  loading: boolean
}

export function useHospitalDashboard(): HospitalDashboardData {
  const [metrics, setMetrics] = useState<HospitalMetrics>({ open: 0, filled: 0, completed: 0 })
  const [recentShifts, setRecentShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<ApiListResponse<Shift>>(
          '/hospitals/me/shifts?limit=5&page=1'
        )
        const shifts = res.data
        setRecentShifts(shifts)
        setMetrics({
          open: shifts.filter((s) => s.status === 'OPEN').length,
          filled: shifts.filter((s) => s.status === 'FILLED').length,
          completed: shifts.filter((s) => s.status === 'COMPLETED').length,
        })
      } catch {
        toast.error('Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return { metrics, recentShifts, loading }
}
