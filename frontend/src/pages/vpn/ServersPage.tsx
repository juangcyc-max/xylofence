import { useState } from 'react'
import { Server, Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useServers, useCreateServer, useDeleteServer } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function ServersPage() {
  const { data: servers = [], isLoading } = useServers()
  const createServer = useCreateServer()
  const deleteServer = useDeleteServer()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', public_host: '', listen_port: '51820',
    vpn_cidr: '10.44.0.0/24', dns: '1.1.1.1',
    client_allowed_ips: '0.0.0.0/0, ::/0',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createServer.mutateAsync({ ...form, listen_port: parseInt(form.listen_port) })
    setShowForm(false)
    setForm({ name: '', public_host: '', listen_port: '51820', vpn_cidr: '10.44.0.0/24', dns: '1.1.1.1', client_allowed_ips: '0.0.0.0/0, ::/0' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="h-6 w-6 text-accent" /> Servidores VPN
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona los servidores WireGuard</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="accent">
          <Plus className="h-4 w-4" /> Nuevo servidor
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear servidor</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Nombre', placeholder: 'vpn-madrid-01' },
                { key: 'public_host', label: 'Host público', placeholder: 'vpn.empresa.com' },
                { key: 'listen_port', label: 'Puerto', placeholder: '51820' },
                { key: 'vpn_cidr', label: 'CIDR VPN', placeholder: '10.44.0.0/24' },
                { key: 'dns', label: 'DNS', placeholder: '1.1.1.1' },
                { key: 'client_allowed_ips', label: 'Allowed IPs cliente', placeholder: '0.0.0.0/0' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="col-span-2 flex gap-3 pt-2">
                <Button type="submit" disabled={createServer.isPending}>
                  {createServer.isPending ? 'Creando...' : 'Crear servidor'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : (servers as any[]).length === 0 ? (
        <p className="text-slate-500 text-center py-12">Sin servidores configurados</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(servers as any[]).map((s: any) => (
            <Card key={s.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-slate-100">{s.name}</p>
                  <div className="flex items-center gap-2">
                    {s.enabled
                      ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => { if (confirm(`¿Eliminar servidor "${s.name}"?`)) deleteServer.mutate(s.id) }}
                      title="Eliminar servidor"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <Row label="Host" value={`${s.public_host}:${s.listen_port}`} />
                  <Row label="CIDR" value={s.vpn_cidr} />
                  <Row label="DNS" value={s.dns ?? '—'} />
                  <Row label="Clave pública" value={s.server_public_key.slice(0, 20) + '…'} mono />
                </div>
                <p className="text-xs text-slate-500">Creado: {formatDate(s.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-300 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
