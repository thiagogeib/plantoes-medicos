'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAdminUsers } from '@/hooks/use-admin-users'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { User, UserRole, UserStatus, ApiError } from '@plantoes-medicos/types'

const ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'Todos os perfis' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'PROFESSIONAL', label: 'Profissional' },
  { value: 'ADMIN', label: 'Admin' },
]

const STATUS_OPTIONS: { value: UserStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'PENDING_VERIFICATION', label: 'Aguardando verificação' },
]

const roleBadgeVariant: Record<UserRole, 'default' | 'success' | 'secondary'> = {
  HOSPITAL: 'default',
  PROFESSIONAL: 'success',
  ADMIN: 'secondary',
}

const roleLabel: Record<UserRole, string> = {
  HOSPITAL: 'Hospital',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Admin',
}

const statusBadgeVariant: Record<UserStatus, 'success' | 'secondary' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  PENDING_VERIFICATION: 'warning',
}

const statusLabel: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  PENDING_VERIFICATION: 'Aguardando',
}

export default function AdminUsuariosPage() {
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [page, setPage] = useState(1)
  const [confirmDialog, setConfirmDialog] = useState<{
    user: User
    action: 'activate' | 'deactivate'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { users, totalPages, loading, reload } = useAdminUsers({
    role: roleFilter,
    status: statusFilter,
    page,
  })

  const handleToggleStatus = async () => {
    if (!confirmDialog) return
    setActionLoading(true)
    try {
      const newStatus: UserStatus =
        confirmDialog.action === 'activate' ? 'ACTIVE' : 'INACTIVE'
      await apiClient.patch(`/admin/users/${confirmDialog.user.id}/status`, {
        status: newStatus,
      })
      toast.success(
        confirmDialog.action === 'activate'
          ? 'Usuário ativado com sucesso'
          : 'Usuário desativado com sucesso'
      )
      setConfirmDialog(null)
      void reload()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao alterar status do usuário')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gerencie todos os usuários da plataforma</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={roleFilter}
          onValueChange={(val) => {
            setRoleFilter(val === '__all__' ? '' : (val as UserRole))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por perfil" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as UserStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-slate-900">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[user.role]}>{roleLabel[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[user.status] as 'success' | 'secondary' | 'warning'}>
                      {statusLabel[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(parseISO(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmDialog({ user, action: 'deactivate' })
                        }
                      >
                        Desativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmDialog({ user, action: 'activate' })
                        }
                      >
                        Ativar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Próxima
          </Button>
        </div>
      )}

      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === 'activate' ? 'Ativar usuário' : 'Desativar usuário'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === 'activate'
                ? `Deseja ativar o usuário ${confirmDialog?.user.email}?`
                : `Deseja desativar o usuário ${confirmDialog?.user.email}? Ele não conseguirá mais acessar a plataforma.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmDialog?.action === 'deactivate' ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Processando...'
                : confirmDialog?.action === 'activate'
                  ? 'Confirmar ativação'
                  : 'Confirmar desativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
