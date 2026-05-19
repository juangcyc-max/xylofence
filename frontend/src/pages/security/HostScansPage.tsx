import { useState, useEffect } from 'react'
import { Monitor, Play, Trash2, ChevronDown, ChevronUp, Cpu, HardDrive, Wifi, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useHostScans, useStartHostScan, useDeleteHostScan, useSystemInfo } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4, none: 5 }
const SEV_LABEL: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo', info: 'Info', none: 'Sin riesgo',
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, string> = {
    critical: 'bg-red-900/40 text-red-300 border border-red-700/40',
    high:     'bg-orange-900/40 text-orange-300 border border-orange-700/40',
    medium:   'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
    low:      'bg-blue-900/40 text-blue-300 border border-blue-700/40',
    info:     'bg-slate-800 text-slate-400 border border-slate-700/40',
    none:     'bg-green-900/40 text-green-300 border border-green-700/40',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[severity] ?? variants.info}`}>
      {SEV_LABEL[severity] ?? severity}
    </span>
  )
}

function SystemInfoPanel() {
  const { data: info, isLoading } = useSystemInfo()

  if (isLoading) return <p className="text-slate-400 text-sm py-4 text-center">Cargando información del sistema...</p>
  if (!info) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-slate-200">Sistema</span>
          </div>
          <InfoRow label="Hostname" value={(info as any).hostname} />
          <InfoRow label="OS" value={`${(info as any).os} ${(info as any).os_release}`} />
          <InfoRow label="Arquitectura" value={(info as any).architecture} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-slate-200">CPU</span>
          </div>
          <InfoRow label="Núcleos lógicos" value={String((info as any).cpu_count_logical)} />
          <InfoRow label="Núcleos físicos" value={String((info as any).cpu_count_physical)} />
          <InfoRow label="Frecuencia" value={(info as any).cpu_freq_mhz ? `${(info as any).cpu_freq_mhz} MHz` : '—'} />
          <InfoRow label="Uso actual" value={`${(info as any).cpu_percent}%`} highlight={(info as any).cpu_percent > 80} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-slate-200">Memoria</span>
          </div>
          <InfoRow label="Total" value={`${(info as any).memory_total_gb} GB`} />
          <InfoRow label="En uso" value={`${(info as any).memory_used_gb} GB`} />
          <InfoRow label="Porcentaje" value={`${(info as any).memory_percent}%`} highlight={(info as any).memory_percent > 85} />
          <InfoRow label="Procesos" value={String((info as any).process_count)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-slate-200">Interfaces de red</span>
          </div>
          {Object.entries((info as any).interfaces ?? {}).slice(0, 4).map(([name, addrs]: [string, any]) => (
            <div key={name}>
              <p className="text-xs text-accent font-medium">{name}</p>
              {addrs.filter((a: any) => a.family !== 'AF_PACKET').slice(0, 2).map((a: any, i: number) => (
                <p key={i} className="text-xs text-slate-400 font-mono truncate">{a.address}</p>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ProcessList({ info }: { info: any }) {
  const [show, setShow] = useState(false)
  const processes: any[] = (info?.processes ?? []).slice(0, 50)

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShow(v => !v)}
        >
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            Procesos en ejecución ({info?.process_count ?? 0})
          </CardTitle>
          {show ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </CardHeader>
      {show && (
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-surface-2">
                  <th className="px-4 py-2 text-left text-slate-400">PID</th>
                  <th className="px-4 py-2 text-left text-slate-400">Nombre</th>
                  <th className="px-4 py-2 text-left text-slate-400">Estado</th>
                  <th className="px-4 py-2 text-left text-slate-400">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {processes.map((p: any) => (
                  <tr key={p.pid} className="hover:bg-surface-2/30">
                    <td className="px-4 py-1.5 text-slate-500 font-mono">{p.pid}</td>
                    <td className="px-4 py-1.5 text-slate-300">{p.name}</td>
                    <td className="px-4 py-1.5 text-slate-500">{p.status}</td>
                    <td className="px-4 py-1.5 text-slate-500 truncate max-w-[120px]">{p.username ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function ScanResultCard({ scan }: { scan: any }) {
  const [expanded, setExpanded] = useState(false)
  const deleteHostScan = useDeleteHostScan()

  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  for (const p of (scan.ports ?? [])) {
    if (p.severity in counts) counts[p.severity as keyof typeof counts]++
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-100">{scan.target}</p>
            <p className="text-xs text-slate-500">{formatDate(scan.started_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {scan.risk_score && <SeverityBadge severity={scan.risk_score} />}
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              scan.status === 'completed' ? 'text-green-400 bg-green-900/20' :
              scan.status === 'running'   ? 'text-yellow-400 bg-yellow-900/20' :
              'text-red-400 bg-red-900/20'
            }`}>{scan.status === 'completed' ? 'Completado' : scan.status === 'running' ? 'Escaneando...' : 'Error'}</span>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm('¿Eliminar este escaneo?')) deleteHostScan.mutate(scan.id) }}>
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          </div>
        </div>
        <div className="flex gap-3 mt-2 text-xs">
          <span className="text-slate-400">{scan.total_ports_scanned} puertos escaneados</span>
          <span className="text-slate-200 font-medium">{scan.open_ports_count} abiertos</span>
          {counts.critical > 0 && <span className="text-red-400">{counts.critical} críticos</span>}
          {counts.high > 0 && <span className="text-orange-400">{counts.high} altos</span>}
          {counts.medium > 0 && <span className="text-yellow-400">{counts.medium} medios</span>}
        </div>
      </CardHeader>

      {scan.ports && scan.ports.length > 0 && (
        <CardContent className="pt-0">
          <button
            className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 mb-3"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Ocultar puertos' : `Ver ${scan.ports.length} puertos abiertos`}
          </button>
          {expanded && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-2 text-left">
                  <th className="pb-2 text-slate-400 font-medium">Puerto</th>
                  <th className="pb-2 text-slate-400 font-medium">Servicio</th>
                  <th className="pb-2 text-slate-400 font-medium">Severidad</th>
                  <th className="pb-2 text-slate-400 font-medium">Descripción</th>
                  <th className="pb-2 text-slate-400 font-medium">Banner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {[...scan.ports].sort((a: any, b: any) => (SEV_ORDER[a.severity] ?? 5) - (SEV_ORDER[b.severity] ?? 5)).map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface-2/30">
                    <td className="py-2 font-mono text-accent">{p.port}/{p.protocol}</td>
                    <td className="py-2 text-slate-300">{p.service}</td>
                    <td className="py-2"><SeverityBadge severity={p.severity} /></td>
                    <td className="py-2 text-slate-400 text-xs max-w-xs">{p.risk_description ?? '—'}</td>
                    <td className="py-2 text-slate-500 font-mono text-xs truncate max-w-[160px]">{p.banner ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs font-medium truncate ${highlight ? 'text-red-400' : 'text-slate-300'}`}>{value}</span>
    </div>
  )
}

export function HostScansPage() {
  const { data: scans = [], isLoading, refetch } = useHostScans()
  const startScan = useStartHostScan()
  const { data: sysInfo } = useSystemInfo()
  const [target, setTarget] = useState('127.0.0.1')
  const [timeout, setTimeout_] = useState('0.5')

  const hasRunning = (scans as any[]).some((s: any) => s.status === 'running')

  useEffect(() => {
    if (!hasRunning) return
    const id = setInterval(() => refetch(), 3000)
    return () => clearInterval(id)
  }, [hasRunning, refetch])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    await startScan.mutateAsync({ target, timeout: parseFloat(timeout) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="h-6 w-6 text-accent" /> Escáner de Host
          </h1>
          <p className="text-slate-400 text-sm mt-1">Análisis completo de puertos, servicios y sistema</p>
        </div>
      </div>

      {/* System info */}
      <SystemInfoPanel />

      {/* Process list */}
      {sysInfo && <ProcessList info={sysInfo} />}

      {/* Scan form */}
      <Card>
        <CardHeader><CardTitle>Nuevo escaneo de puertos</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>IP o dominio objetivo</Label>
              <Input
                placeholder="127.0.0.1 / 192.168.1.1 / ejemplo.com"
                value={target}
                onChange={e => setTarget(e.target.value)}
                required
              />
            </div>
            <div className="w-36 space-y-1.5">
              <Label>Timeout por puerto (s)</Label>
              <Input
                type="number" min="0.2" max="3" step="0.1"
                value={timeout}
                onChange={e => setTimeout_(e.target.value)}
              />
            </div>
            <Button type="submit" variant="accent" disabled={startScan.isPending || hasRunning}>
              <Play className="h-4 w-4" />
              {startScan.isPending || hasRunning ? 'Escaneando...' : 'Escanear'}
            </Button>
          </form>
          <p className="text-xs text-slate-500 mt-2">
            Se escanean {' '}
            <span className="text-slate-300">~{80} puertos clave</span> de forma asíncrona.
            Usa <span className="text-slate-300">127.0.0.1</span> para tu propia máquina o cualquier IP de tu red.
          </p>
        </CardContent>
      </Card>

      {/* Scan history */}
      {isLoading ? (
        <p className="text-slate-400 text-center py-8">Cargando...</p>
      ) : (scans as any[]).length === 0 ? (
        <p className="text-slate-500 text-center py-8">Sin escaneos realizados</p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Historial de escaneos</h2>
          {(scans as any[]).map((s: any) => (
            <ScanResultCard key={s.id} scan={s} />
          ))}
        </div>
      )}
    </div>
  )
}
