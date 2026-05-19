import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useIncidents, useUpdateIncident } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['open', 'investigating', 'mitigated', 'closed']
const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', investigating: 'Investigando', mitigated: 'Mitigado', closed: 'Cerrado',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-900/30 text-red-400',
  investigating: 'bg-yellow-900/30 text-yellow-400',
  mitigated: 'bg-blue-900/30 text-blue-400',
  closed: 'bg-green-900/30 text-green-400',
}

export function IncidentsPage() {
  const { data: incidents = [], isLoading } = useIncidents()
  const updateIncident = useUpdateIncident()
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = filterStatus === 'all'
    ? (incidents as any[])
    : (incidents as any[]).filter((i: any) => i.status === filterStatus)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-400" /> Incidentes
        </h1>
        <p className="text-slate-400 text-sm mt-1">Hallazgos de alta/crítica severidad que requieren atención</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-primary text-black'
                : 'bg-surface-2 text-slate-400 hover:text-slate-100'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-12">Sin incidentes</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc: any) => (
            <Card key={inc.id}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={inc.severity as any}>{inc.severity}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[inc.status]}`}>
                        {STATUS_LABELS[inc.status]}
                      </span>
                      <span className="text-slate-500 text-xs">Activo #{inc.asset_id}</span>
                    </div>
                    <p className="font-medium text-slate-100">{inc.title}</p>
                    <p className="text-sm text-slate-400 line-clamp-2">{inc.description}</p>
                    {inc.actions_taken && (
                      <p className="text-xs text-slate-500 border-l-2 border-accent pl-3 mt-1">
                        {inc.actions_taken}
                      </p>
                    )}
                    <p className="text-xs text-slate-600">{formatDate(inc.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {STATUSES.filter(s => s !== inc.status).slice(0, 2).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === 'closed' ? 'secondary' : 'outline'}
                        onClick={() => updateIncident.mutate({ id: inc.id, data: { status: s } })}
                        disabled={updateIncident.isPending}
                      >
                        → {STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
