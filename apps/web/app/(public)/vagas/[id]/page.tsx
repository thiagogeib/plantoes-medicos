import type { Metadata } from 'next'
import { VagaDetailClient } from './VagaDetailClient'
import type { Shift, ApiResponse } from '@plantoes-medicos/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://plantoes-medicos-web.vercel.app'

async function fetchShift(id: string): Promise<Shift | null> {
  try {
    const res = await fetch(`${API_BASE}/public/shifts/${id}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const json = (await res.json()) as ApiResponse<Shift>
    return json.data
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const shift = await fetchShift(id)

  if (!shift) {
    return { title: 'Plantão não encontrado — PlantoesMed' }
  }

  const title = `${shift.title} — ${shift.specialty?.name ?? 'Plantão'} em ${shift.hospital?.city ?? ''} | PlantoesMed`
  const description = `${shift.specialty?.name ?? 'Plantão'} em ${shift.hospital?.name ?? 'hospital parceiro'}, ${shift.hospital?.city ?? ''}/${shift.hospital?.state ?? ''}. ${shift.description.slice(0, 120)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${WEB_URL}/vagas/${id}`,
      siteName: 'PlantoesMed',
      locale: 'pt_BR',
      type: 'website',
    },
    alternates: { canonical: `${WEB_URL}/vagas/${id}` },
  }
}

export default async function VagaPublicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const shift = await fetchShift(id)

  const jsonLd = shift
    ? {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: shift.title,
        description: shift.description,
        datePosted: shift.createdAt,
        validThrough: new Date(shift.date).toISOString(),
        employmentType: 'CONTRACTOR',
        hiringOrganization: {
          '@type': 'Organization',
          name: shift.hospital?.name ?? 'Hospital parceiro',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: shift.hospital?.city,
            addressRegion: shift.hospital?.state,
            addressCountry: 'BR',
          },
        },
        directApply: true,
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <VagaDetailClient />
    </>
  )
}
