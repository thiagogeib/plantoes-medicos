'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Shift, ApiListResponse } from '@plantoes-medicos/types'

interface UseShiftsOptions {
  specialtyId?: string
  city?: string
  page?: number
  limit?: number
}

export function useShifts({ specialtyId, city, page = 1, limit = 12 }: UseShiftsOptions = {}) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: 'OPEN',
      })
      if (specialtyId) params.set('specialtyId', specialtyId)
      if (city) params.set('city', city)

      const res = await apiClient.get<ApiListResponse<Shift>>(`/shifts?${params.toString()}`)
      setShifts(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar plantões')
    } finally {
      setLoading(false)
    }
  }, [specialtyId, city, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  return { shifts, totalPages, loading, reload: load }
}
