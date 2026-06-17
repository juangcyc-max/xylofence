import { useState } from 'react'
import { Users, Plus, UserCheck, UserX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function UsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'user' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createUser.mutateAsync(form)
    setShowForm(false)
    setForm({ email: '', full_name: '', password: '', role: 'user' })
  }

  const toggleActive = (user: any) =>
    updateUser.mutate({ id: user.id, data: { is_active: !user.is_active } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" /> Usuarios
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona los accesos a la plataforma</p>
        </div>
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
                  <option value="user">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={createUser.isPending}>{createUser.isPending ? 'Creando...' : 'Crear'}</Button>
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
                      <Badge variant={u.role === 'admin' ? 'medium' : 'info'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="text-green-400 text-xs font-medium">Activo</span>
                        : <span className="text-red-400 text-xs font-medium">Inactivo</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                        {u.is_active ? <UserX className="h-3.5 w-3.5 text-red-400" /> : <UserCheck className="h-3.5 w-3.5 text-green-400" />}
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
