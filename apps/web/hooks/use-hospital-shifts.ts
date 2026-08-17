'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Shift, ShiftStatus, ApiListResponse, CompensationType } from '@plantoes-medicos/types'

interface UseHospitalShiftsOptions {
  status?: ShiftStatus | ''
  specialtyId?: string
  compensationType?: CompensationType | ''
  requiredCouncilType?: 'CRM' | 'COREN' | ''
  date?: string
  diaSemana?: number
  hasCandidates?: boolean
  page?: number
  limit?: number
}

export function useHospitalShifts({
  status,
  specialtyId,
  compensationType,
  requiredCouncilType,
  date,
  diaSemana,
  hasCandidates,
  page = 1,
  limit = 10,
}: UseHospitalShiftsOptions = {}) {
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
      if (specialtyId) params.set('specialtyId', specialtyId)
      if (compensationType) params.set('compensationType', compensationType)
      if (requiredCouncilType) params.set('requiredCouncilType', requiredCouncilType)
      if (date) {
        params.set('dateFrom', date)
        params.set('dateTo', date)
      }
      if (diaSemana !== undefined) params.set('diaSemana', String(diaSemana))
      if (hasCandidates !== undefined) params.set('hasCandidates', String(hasCandidates))

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
  }, [status, specialtyId, compensationType, requiredCouncilType, date, diaSemana, hasCandidates, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  return { shifts, totalPages, loading, reload: load }
}
