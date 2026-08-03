'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Shift, ApiListResponse, CompensationType, Turno } from '@plantoes-medicos/types'

interface UseShiftsOptions {
  specialtyId?: string
  city?: string
  compensationType?: CompensationType
  turno?: Turno
  raioKm?: number
  date?: string
  diaSemana?: number
  page?: number
  limit?: number
}

export function useShifts({
  specialtyId,
  city,
  compensationType,
  turno,
  raioKm,
  date,
  diaSemana,
  page = 1,
  limit = 12,
}: UseShiftsOptions = {}) {
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
      if (compensationType) params.set('compensationType', compensationType)
      if (turno) params.set('turno', turno)
      if (raioKm) params.set('raioKm', String(raioKm))
      if (date) {
        params.set('dateFrom', date)
        params.set('dateTo', date)
      }
      if (diaSemana !== undefined) params.set('diaSemana', String(diaSemana))

      const res = await apiClient.get<ApiListResponse<Shift>>(`/shifts?${params.toString()}`)
      setShifts(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar plantões')
    } finally {
      setLoading(false)
    }
  }, [specialtyId, city, compensationType, turno, raioKm, date, diaSemana, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  return { shifts, totalPages, loading, reload: load }
}
