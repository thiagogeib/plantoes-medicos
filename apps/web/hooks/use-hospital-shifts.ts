'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Shift, ShiftStatus, ApiListResponse } from '@plantoes-medicos/types'

interface UseHospitalShiftsOptions {
  status?: ShiftStatus | ''
  page?: number
  limit?: number
}

export function useHospitalShifts({ status, page = 1, limit = 10 }: UseHospitalShiftsOptions = {}) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (status) params.set('status', status)

      const res = await apiClient.get<ApiListResponse<Shift>>(
        `/hospitals/me/shifts?${params.toString()}`
      )
      setShifts(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar plantões')
    } finally {
      setLoading(false)
    }
  }, [status, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  return { shifts, totalPages, loading, reload: load }
}
