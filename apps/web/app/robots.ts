import type { MetadataRoute } from 'next'

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://plantoes-medicos-web.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/vagas', '/login', '/cadastro'],
      disallow: ['/hospital', '/profissional', '/admin'],
    },
    sitemap: `${WEB_URL}/sitemap.xml`,
  }
}
