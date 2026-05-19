import { useState } from 'react'
import { Globe, Plus, Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { usePeers, useCreatePeer, useRevokePeer, useRestorePeer, useDeletePeer, useServers, useUsers } from '@/hooks/useApi'
import { peersApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export function PeersPage() {
  const { data: peers = [], isLoading } = usePeers()
  const { data: servers = [] } = useServers()
  const { data: users = [] } = useUsers()
  const createPeer = useCreatePeer()
  const revokePeer = useRevokePeer()
  const restorePeer = useRestorePeer()
  const deletePeer = useDeletePeer()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ user_id: '', server_id: '', name: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createPeer.mutateAsync({ ...form, user_id: parseInt(form.user_id), server_id: parseInt(form.server_id) })
    setShowForm(false)
    setForm({ user_id: '', server_id: '', name: '' })
  }

  const downloadConf = async (peerId: number, peerName: string) => {
    const res = await peersApi.clientConf(peerId)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = `${peerName}.conf`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-accent" /> Dispositivos VPN
          </h1>
          <p className="text-slate-400 text-sm mt-1">Peers y configuraciones WireGuard</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="accent">
          <Plus className="h-4 w-4" /> Nuevo peer
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear peer</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Usuario</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-surface-2 bg-surface px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.user_id}
                  onChange={e => setForm(prev => ({ ...prev, user_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {(users as any[]).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Servidor</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-surface-2 bg-surface px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.server_id}
                  onChange={e => setForm(prev => ({ ...prev, server_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {(servers as any[]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del dispositivo</Label>
                <Input placeholder="laptop-ana" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div className="col-span-3 flex gap-3">
                <Button type="submit" disabled={createPeer.isPending}>{createPeer.isPending ? 'Creando...' : 'Crear'}</Button>
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
                  {['Nombre', 'IP asignada', 'Usuario', 'Servidor', 'Estado', 'Creado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {(peers as any[]).map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-accent text-xs">{p.allocated_ip}</td>
                    <td className="px-4 py-3 text-slate-400">{p.user_id}</td>
                    <td className="px-4 py-3 text-slate-400">{p.server_id}</td>
                    <td className="px-4 py-3">
                      {p.revoked
                        ? <Badge variant="critical">Revocado</Badge>
                        : <span className="text-green-400 text-xs font-medium">Activo</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => downloadConf(p.id, p.name)} title="Descargar .conf">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {p.revoked
                          ? <Button size="sm" variant="outline" onClick={() => restorePeer.mutate(p.id)}>Restaurar</Button>
                          : <Button size="sm" variant="danger" onClick={() => revokePeer.mutate(p.id)}>Revocar</Button>}
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`¿Eliminar peer "${p.name}"?`)) deletePeer.mutate(p.id) }} title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(peers as any[]).length === 0 && (
              <p className="text-slate-500 text-center py-12">Sin peers registrados</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
