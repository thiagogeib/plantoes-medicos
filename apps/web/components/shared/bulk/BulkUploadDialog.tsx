'use client'

import { useState, type FC } from 'react'
import { toast } from 'sonner'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { apiClient } from '@/lib/api-client'
import type { ApiError } from '@plantoes-medicos/types'

interface RowResult {
  linha: number
  sucesso: boolean
  erro?: string
}

interface BulkResultResponse {
  data: {
    total: number
    sucesso: number
    falhas: number
    resultados: RowResult[]
  }
}

interface BulkUploadDialogProps {
  triggerLabel: string
  title: string
  description: string
  templatePath: string
  templateFilename: string
  uploadPath: string
  onSuccess?: () => void
}

export const BulkUploadDialog: FC<BulkUploadDialogProps> = ({
  triggerLabel,
  title,
  description,
  templatePath,
  templateFilename,
  uploadPath,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkResultResponse['data'] | null>(null)

  async function handleTemplate() {
    try {
      await apiClient.downloadFile(templatePath, templateFilename)
    } catch {
      toast.error('Erro ao baixar modelo')
    }
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const res = await apiClient.uploadFile<BulkResultResponse>(uploadPath, file)
      setResult(res.data)
      if (res.data.falhas === 0) {
        toast.success(`${res.data.sucesso} linha(s) processada(s) com sucesso`)
      } else {
        toast.warning(`${res.data.sucesso} ok, ${res.data.falhas} com erro — veja os detalhes abaixo`)
      }
      onSuccess?.()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao enviar arquivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setFile(null)
          setResult(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={handleTemplate} className="w-full">
            <Download className="h-4 w-4 mr-1.5" />
            Baixar modelo CSV
          </Button>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:text-sm"
          />

          {result && (
            <div className="max-h-56 overflow-y-auto border rounded-md p-3 space-y-1.5 text-sm">
              <p className="font-medium">
                {result.sucesso}/{result.total} processadas com sucesso
              </p>
              {result.resultados
                .filter((r) => !r.sucesso)
                .map((r) => (
                  <div key={r.linha} className="flex items-start gap-2">
                    <Badge variant="destructive" className="shrink-0">Linha {r.linha}</Badge>
                    <span className="text-slate-600">{r.erro}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? 'Enviando...' : 'Enviar arquivo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
