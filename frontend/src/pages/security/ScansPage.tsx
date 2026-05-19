import { useState } from 'react'
import { ScanLine, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useScans, useCreateScan, useScanFindings, useAssets } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

function ScanFindings({ scanId }: { scanId: number }) {
  const { data: findings = [], isLoading } = useScanFindings(scanId)
  if (isLoading) return <p className="text-slate-500 text-xs px-4 py-2">Cargando hallazgos...</p>
  if ((findings as any[]).length === 0) return <p className="text-slate-500 text-xs px-4 py-3">Sin hallazgos.</p>
  return (
    <div className="divide-y divide-surface-2">
      {(findings as any[]).map((f: any) => (
        <div key={f.id} className="px-4 py-3 flex gap-3 items-start">
          <Badge variant={f.severity as any}>{f.severity}</Badge>
          <div>
            <p className="text-sm text-slate-200">{f.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{f.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ScansPage() {
  const { data: scans = [], isLoading } = useScans()
  const { data: assets = [] } = useAssets()
  const createScan = useCreateScan()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [form, setForm] = useState({ asset_id: '', profile: 'passive' })
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await createScan.mutateAsync({ ...form, asset_id: parseInt(form.asset_id) }) as any
    setExpanded(res.id)
    setShowForm(false)
  }

  const statusColor = (s: string) => {
    if (s === 'completed') return 'text-green-400'
    if (s === 'running') return 'text-yellow-400'
    if (s === 'completed_with_errors') return 'text-orange-400'
    return 'text-slate-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-accent" /> Escaneos
          </h1>
          <p className="text-slate-400 text-sm mt-1">Auditorías defensivas sobre activos web</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="accent">
          <Play className="h-4 w-4" /> Lanzar escaneo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Lanzar escaneo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
              <div className="space-y-1.5 flex-1">
                <label className="text-sm font-medium text-slate-300">Activo</label>
                <select
                  className="flex h-9 w-full rounded-md border border-surface-2 bg-surface px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.asset_id}
                  onChange={e => setForm(prev => ({ ...prev, asset_id: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar activo...</option>
                  {(assets as any[]).filter((a: any) => a.authorized).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Perfil</label>
                <select
                  className="flex h-9 rounded-md border border-surface-2 bg-surface px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.profile}
                  onChange={e => setForm(prev => ({ ...prev, profile: e.target.value }))}
                >
                  <option value="passive">Pasivo</option>
                  <option value="safe_active">Activo seguro</option>
                </select>
              </div>
              <Button type="submit" disabled={createScan.isPending}>
                {createScan.isPending ? 'Escaneando...' : 'Lanzar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-surface-2">
              {(scans as any[]).length === 0 && (
                <p className="text-slate-500 text-center py-12">Sin escaneos</p>
              )}
              {(scans as any[]).map((s: any) => (
                <div key={s.id}>
                  <div
                    className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/30 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  >
                    <span className="text-slate-500 text-xs w-6">#{s.id}</span>
                    <Badge variant="info">{s.profile}</Badge>
                    <span className={`text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span>
                    <span className="text-slate-500 text-xs">Activo #{s.asset_id}</span>
                    <span className="text-slate-500 text-xs ml-auto">{formatDate(s.finished_at ?? s.started_at)}</span>
                    {expanded === s.id
                      ? <ChevronUp className="h-4 w-4 text-slate-400" />
                      : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                  {expanded === s.id && (
                    <div className="bg-bg border-t border-surface-2">
                      <ScanFindings scanId={s.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
