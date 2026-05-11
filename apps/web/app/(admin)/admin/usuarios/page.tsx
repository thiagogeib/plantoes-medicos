'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAdminUsers } from '@/hooks/use-admin-users'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, Building2, Stethoscope } from 'lucide-react'
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

// ── Hospital form ──────────────────────────────────────────────────────────────

const hospitalSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa ter letra maiúscula')
    .regex(/[0-9]/, 'Precisa ter número'),
  name: z.string().min(1, 'Obrigatório'),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ: 14 dígitos sem pontuação'),
  phone: z.string().min(1, 'Obrigatório'),
  street: z.string().min(1, 'Obrigatório'),
  number: z.string().min(1, 'Obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Obrigatório'),
  city: z.string().min(1, 'Obrigatório'),
  state: z.string().length(2, 'UF: 2 letras'),
  zipCode: z.string().regex(/^\d{8}$/, 'CEP: 8 dígitos sem traço'),
})
type HospitalFormValues = z.infer<typeof hospitalSchema>

function CreateHospitalDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const form = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      email: '', password: '', name: '', cnpj: '', phone: '',
      street: '', number: '', complement: '', neighborhood: '',
      city: '', state: '', zipCode: '',
    },
  })

  const onSubmit = async (values: HospitalFormValues) => {
    try {
      await apiClient.post('/admin/users/hospital', values)
      toast.success('Hospital criado com sucesso')
      form.reset()
      onCreated()
      onClose()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao criar hospital')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar conta — Hospital</DialogTitle>
          <DialogDescription>Preencha os dados do hospital para criar a conta.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome do hospital</FormLabel>
                  <FormControl><Input placeholder="Hospital Municipal XYZ" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="contato@hospital.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl><Input type="password" placeholder="Min. 8 chars, maiúscula e número" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ (14 dígitos)</FormLabel>
                  <FormControl><Input placeholder="00000000000000" maxLength={14} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Rua</FormLabel>
                  <FormControl><Input placeholder="Av. Paulista" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl><Input placeholder="100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="complement" render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl><Input placeholder="Bloco A (opcional)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl><Input placeholder="Centro" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="zipCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP (8 dígitos)</FormLabel>
                  <FormControl><Input placeholder="01310100" maxLength={8} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input placeholder="São Paulo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>UF</FormLabel>
                  <FormControl><Input placeholder="SP" maxLength={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Criando...' : 'Criar hospital'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Professional form ──────────────────────────────────────────────────────────

const professionalSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa ter letra maiúscula')
    .regex(/[0-9]/, 'Precisa ter número'),
  name: z.string().min(1, 'Obrigatório'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF: 11 dígitos sem pontuação'),
  phone: z.string().min(1, 'Obrigatório'),
  councilType: z.enum(['CRM', 'COREN']),
  councilNumber: z.string().min(1, 'Obrigatório'),
  councilState: z.string().length(2, 'UF: 2 letras'),
  specialtyIds: z.array(z.string()).min(1, 'Selecione ao menos uma especialidade'),
})
type ProfessionalFormValues = z.infer<typeof professionalSchema>

interface Specialty { id: string; name: string }

function CreateProfessionalDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [specialties, setSpecialties] = useState<Specialty[]>([])

  useEffect(() => {
    if (!open) return
    apiClient
      .get<{ data: Specialty[] }>('/specialties')
      .then((r) => setSpecialties(r.data))
      .catch(() => {})
  }, [open])

  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      email: '', password: '', name: '', cpf: '', phone: '',
      councilType: 'CRM', councilNumber: '', councilState: '',
      specialtyIds: [],
    },
  })

  const onSubmit = async (values: ProfessionalFormValues) => {
    try {
      await apiClient.post('/admin/users/professional', values)
      toast.success('Profissional criado com sucesso')
      form.reset()
      onCreated()
      onClose()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao criar profissional')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar conta — Profissional</DialogTitle>
          <DialogDescription>Preencha os dados do profissional para criar a conta.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl><Input placeholder="Dr. João Silva" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="dr@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl><Input type="password" placeholder="Min. 8 chars, maiúscula e número" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF (11 dígitos)</FormLabel>
                  <FormControl><Input placeholder="00000000000" maxLength={11} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="councilType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conselho</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CRM">CRM</SelectItem>
                      <SelectItem value="COREN">COREN</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="councilNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do conselho</FormLabel>
                  <FormControl><Input placeholder="123456" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="councilState" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Estado do conselho (UF)</FormLabel>
                  <FormControl><Input placeholder="SP" maxLength={2} className="w-24" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="specialtyIds" render={() => (
              <FormItem>
                <FormLabel>Especialidades</FormLabel>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 max-h-48 overflow-y-auto">
                  {specialties.map((s) => (
                    <FormField key={s.id} control={form.control} name="specialtyIds" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(s.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value ?? []), s.id])
                              } else {
                                field.onChange(field.value?.filter((v) => v !== s.id))
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm cursor-pointer">{s.name}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Criando...' : 'Criar profissional'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [page, setPage] = useState(1)
  const [confirmDialog, setConfirmDialog] = useState<{
    user: User
    action: 'activate' | 'deactivate'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [createHospitalOpen, setCreateHospitalOpen] = useState(false)
  const [createProfessionalOpen, setCreateProfessionalOpen] = useState(false)

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie todos os usuários da plataforma</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shrink-0">
              Novo usuário <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateHospitalOpen(true)}>
              <Building2 className="mr-2 h-4 w-4" /> Hospital
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCreateProfessionalOpen(true)}>
              <Stethoscope className="mr-2 h-4 w-4" /> Profissional
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                        onClick={() => setConfirmDialog({ user, action: 'deactivate' })}
                      >
                        Desativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDialog({ user, action: 'activate' })}
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

      <CreateHospitalDialog
        open={createHospitalOpen}
        onClose={() => setCreateHospitalOpen(false)}
        onCreated={() => void reload()}
      />

      <CreateProfessionalDialog
        open={createProfessionalOpen}
        onClose={() => setCreateProfessionalOpen(false)}
        onCreated={() => void reload()}
      />
    </div>
  )
}
