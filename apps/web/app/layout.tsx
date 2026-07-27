import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://plantoes-medicos-web.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(WEB_URL),
  title: {
    default: 'PlantoesMed — Plantões médicos e de enfermagem',
    template: '%s | PlantoesMed',
  },
  description:
    'Encontre plantões médicos e de enfermagem perto de você, ou publique vagas para sua equipe. Candidatura em minutos, sem intermediários.',
  openGraph: {
    siteName: 'PlantoesMed',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
