import type { MetadataRoute } from 'next'
import type { Shift, ApiListResponse } from '@plantoes-medicos/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://plantoes-medicos-web.vercel.app'

async function fetchOpenShiftIds(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/public/shifts?limit=50`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = (await res.json()) as ApiListResponse<Shift>
    return json.data.map((s) => s.id)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shiftIds = await fetchOpenShiftIds()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: WEB_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${WEB_URL}/vagas`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${WEB_URL}/cadastro/profissional`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${WEB_URL}/cadastro/hospital`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${WEB_URL}/login`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const shiftRoutes: MetadataRoute.Sitemap = shiftIds.map((id) => ({
    url: `${WEB_URL}/vagas/${id}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  return [...staticRoutes, ...shiftRoutes]
}
