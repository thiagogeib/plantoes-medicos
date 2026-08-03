import { useAuthStore } from '@/stores/auth.store'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  body?: unknown
  headers?: Record<string, string>
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return null
      const json = (await res.json()) as { data: { accessToken: string } }
      return json.data.accessToken
    })
    .catch(() => null)
    .finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

  return refreshPromise
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const store = useAuthStore.getState()
  const token = store.accessToken

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  }

  if (options.body !== undefined) {
    config.body = JSON.stringify(options.body)
  }

  let response = await fetch(`${BASE_URL}${path}`, config)

  if (response.status === 401) {
    const newToken = await refreshAccessToken()

    if (!newToken) {
      useAuthStore.getState().clearAuth()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Sessão expirada')
    }

    useAuthStore.getState().setAuth(newToken, store.user!)

    const retryHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${newToken}`,
      ...options.headers,
    }

    const retryConfig: RequestInit = {
      method,
      headers: retryHeaders,
      credentials: 'include',
    }

    if (options.body !== undefined) {
      retryConfig.body = JSON.stringify(options.body)
    }

    response = await fetch(`${BASE_URL}${path}`, retryConfig)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Erro desconhecido' },
    }))
    throw errorData
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = useAuthStore.getState().accessToken
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Erro desconhecido' },
    }))
    throw errorData
  }

  return response.json() as Promise<T>
}

async function downloadFile(path: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: 'Erro desconhecido' },
    }))
    throw errorData
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
  uploadFile,
  downloadFile,
}
