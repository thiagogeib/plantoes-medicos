'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { Application, ApplicationStatus, ApiListResponse } from '@plantoes-medicos/types'

interface UseMyApplicationsOptions {
  status?: ApplicationStatus | ''
  page?: number
  limit?: number
}

export function useMyApplications({
  status,
  page = 1,
  limit = 10,
}: UseMyApplicationsOptions = {}) {
  const [applications, setApplications] = useState<Application[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (status) params.set('status', status)

      const res = await apiClient.get<ApiListResponse<Application>>(
        `/applications/me?${params.toString()}`
      )
      setApplications(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar candidaturas')
    } finally {
      setLoading(false)
    }
  }, [status, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  return { applications, totalPages, loading, reload: load }
}
