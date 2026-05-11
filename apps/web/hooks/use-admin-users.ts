'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { User, UserRole, UserStatus, ApiListResponse } from '@plantoes-medicos/types'

interface UseAdminUsersOptions {
  role?: UserRole | ''
  status?: UserStatus | ''
  page?: number
  limit?: number
}

export function useAdminUsers({
  role,
  status,
  page = 1,
  limit = 10,
}: UseAdminUsersOptions = {}) {
  const [users, setUsers] = useState<User[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (role) params.set('role', role)
      if (status) params.set('status', status)

      const res = await apiClient.get<ApiListResponse<User>>(`/admin/users?${params.toString()}`)
      setUsers(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [role, status, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  return { users, totalPages, loading, reload: load }
}
