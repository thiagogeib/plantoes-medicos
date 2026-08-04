'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { RiskShift, ApiResponse } from '@plantoes-medicos/types'

export function useShiftsAtRisk() {
  const [shifts, setShifts] = useState<RiskShift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<ApiResponse<RiskShift[]>>('/admin/shifts-at-risk')
      .then((res) => setShifts(res.data))
      .catch(() => toast.error('Erro ao carregar plantões em risco'))
      .finally(() => setLoading(false))
  }, [])

  return { shifts, loading }
}
