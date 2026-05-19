import { useState } from 'react'
import { Users, Plus, UserCheck, UserX, Mail, Link2, Trash2, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  useUsers, useCreateUser, useUpdateUser,
  useInvitations, useCreateInvitation, useDeleteInvitation,
} from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', viewer: 'Visor', client: 'Cliente',
}

const ROLE_VARIANT: Record<string, 'critical' | 'medium' | 'low' | 'info'> = {
  admin: 'critical', manager: 'medium', viewer: 'low', client: 'info',
}

type Tab = 'users' | 'invitations'

export function UsersPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" /> Usuarios
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona los accesos a la plataforma</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['users', 'invitations'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
            style={tab === t
              ? { background: '#CA8A04', color: '#000' }
              : { color: '#94a3b8' }}
          >
            {t === 'users' ? 'Usuarios' : 'Invitaciones'}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UsersTab /> : <InvitationsTab />}
    </div>
  )
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

function UsersTab() {
  const { data: users = [], isLoading } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'client' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createUser.mutateAsync(form)
    setShowForm(false)
    setForm({ email: '', full_name: '', password: '', role: 'client' })
  }

  const toggleActive = (user: any) =>
    updateUser.mutate({ id: user.id, data: { is_active: !user.is_active } })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} variant="accent">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear usuario</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { key: 'email', label: 'Email', placeholder: 'usuario@empresa.com', type: 'email' },
                { key: 'full_name', label: 'Nombre completo', placeholder: 'Ana García', type: 'text' },
                { key: 'password', label: 'Contraseña', placeholder: 'mínimo 8 caracteres', type: 'password' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input type={f.type} placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-surface-2 bg-surface px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.role}
                  onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="client">Cliente</option>
                  <option value="viewer">Visor (solo lectura)</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? 'Creando...' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-2 text-left">
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Creado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {(users as any[]).map((u: any) => (
                  <tr key={u.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANT[u.role] ?? 'info'}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="text-green-400 text-xs font-medium">Activo</span>
                        : <span className="text-red-400 text-xs font-medium">Inactivo</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                        {u.is_active
                          ? <UserX className="h-3.5 w-3.5 text-red-400" />
                          : <UserCheck className="h-3.5 w-3.5 text-green-400" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(users as any[]).length === 0 && (
              <p className="text-slate-500 text-center py-12">Sin usuarios</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Invitaciones ──────────────────────────────────────────────────────────────

function InvitationsTab() {
  const { data: invitations = [], isLoading } = useInvitations()
  const createInvitation = useCreateInvitation()
  const deleteInvitation = useDeleteInvitation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'client' })
  const [newLink, setNewLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createInvitation.mutateAsync({ email: form.email || undefined, role: form.role })
    setNewLink((result as any).link)
    setShowForm(false)
    setForm({ email: '', role: 'client' })
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(!showForm); setNewLink(null) }} variant="accent">
          <Mail className="h-4 w-4" /> Nueva invitación
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear invitación</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  placeholder="cliente@empresa.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-surface-2 bg-surface px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="client">Cliente</option>
                  <option value="viewer">Visor</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? 'Generando...' : 'Generar link'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {newLink && (
        <div className="rounded-lg p-4 space-y-2" style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.3)' }}>
          <p className="text-sm font-medium text-cyan-300 flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Link de invitación generado
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-300 bg-black/30 px-3 py-2 rounded break-all">{newLink}</code>
            <Button size="sm" variant="outline" onClick={() => copyLink(newLink)}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-slate-500">Válido 72 horas · uso único</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-2 text-left">
                  {['Email', 'Rol', 'Estado', 'Expira', 'Creado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {(invitations as any[]).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{inv.email ?? <span className="text-slate-600 italic">sin email</span>}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANT[inv.role] ?? 'info'}>{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {inv.used_at
                        ? <span className="text-slate-500 text-xs">Usada</span>
                        : new Date(inv.expires_at) < new Date()
                          ? <span className="text-red-400 text-xs">Expirada</span>
                          : <span className="text-green-400 text-xs font-medium">Pendiente</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(inv.expires_at)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3">
                      {!inv.used_at && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => { if (confirm('¿Cancelar esta invitación?')) deleteInvitation.mutate(inv.id) }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(invitations as any[]).length === 0 && (
              <p className="text-slate-500 text-center py-12">Sin invitaciones</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
