import { Download, Globe, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePeers } from '@/hooks/useApi'
import { peersApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { formatDate } from '@/lib/utils'

export function MyPage() {
  const { user } = useAuthStore()
  const { data: peers = [], isLoading } = usePeers()

  const downloadConf = async (peerId: number, peerName: string) => {
    const res = await peersApi.clientConf(peerId)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = `${peerName}.conf`; a.click()
    URL.revokeObjectURL(url)
  }

  const activePeers = (peers as any[]).filter(p => !p.revoked)

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="flex items-center gap-4 p-5 rounded-xl"
        style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.3)' }}>
          <span className="text-xl font-bold font-mono text-yellow-500">
            {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Bienvenido, {user?.full_name}</h1>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Wifi className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activePeers.length}</p>
              <p className="text-xs text-slate-400">Dispositivos activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(8,145,178,0.1)' }}>
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{(peers as any[]).length}</p>
              <p className="text-xs text-slate-400">Total configuraciones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispositivos VPN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-400" /> Mis dispositivos VPN
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-slate-400 text-center py-10">Cargando...</p>
          ) : (peers as any[]).length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <WifiOff className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-slate-500">No tienes dispositivos VPN asignados todavía.</p>
              <p className="text-slate-600 text-sm">Contacta con el administrador para que configure tu acceso.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-2 text-left">
                  {['Dispositivo', 'IP asignada', 'Estado', 'Creado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {(peers as any[]).map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{p.allocated_ip}</td>
                    <td className="px-4 py-3">
                      {p.revoked
                        ? <Badge variant="critical">Revocado</Badge>
                        : <span className="text-green-400 text-xs font-medium">Activo</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      {!p.revoked && (
                        <Button size="sm" variant="outline" onClick={() => downloadConf(p.id, p.name)}>
                          <Download className="h-3.5 w-3.5 mr-1" /> Descargar .conf
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
