import { Shield, Server, Globe, AlertTriangle, Users, ScanLine, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useServers } from '@/hooks/useApi'
import { usePeers } from '@/hooks/useApi'
import { useIncidents } from '@/hooks/useApi'
import { useAssets } from '@/hooks/useApi'
import { useScans } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#3b82f6',
  info:     '#64748b',
}

export function DashboardPage() {
  const { data: servers  = [] } = useServers()
  const { data: peers    = [] } = usePeers()
  const { data: incidents = [] } = useIncidents()
  const { data: assets   = [] } = useAssets()
  const { data: scans    = [] } = useScans()

  const activePeers   = (peers as any[]).filter((p: any) => !p.revoked).length
  const openIncidents = (incidents as any[]).filter((i: any) => i.status === 'open').length

  const sevCounts = ['critical', 'high', 'medium', 'low', 'info'].map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: (incidents as any[]).filter((i: any) => i.severity === sev).length,
    sev,
  }))

  const recentIncidents = [...(incidents as any[])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Servidores VPN',   value: (servers as any[]).length,  icon: Server,        color: 'text-accent' },
    { label: 'Peers activos',    value: activePeers,                 icon: Globe,         color: 'text-primary' },
    { label: 'Activos web',      value: (assets as any[]).length,    icon: Shield,        color: 'text-blue-400' },
    { label: 'Escaneos',         value: (scans as any[]).length,     icon: ScanLine,      color: 'text-violet-400' },
    { label: 'Incidentes abiertos', value: openIncidents,            icon: AlertTriangle, color: 'text-orange-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen de la plataforma Xylofence</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-5 w-5 ${s.color} mt-0.5`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Incidents by severity chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Incidentes por severidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sevCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {sevCounts.map(entry => (
                    <Cell key={entry.sev} fill={SEVERITY_COLORS[entry.sev]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Incidentes recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Sin incidentes registrados</p>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((inc: any) => (
                  <div key={inc.id} className="flex items-start gap-3 p-3 rounded-md bg-bg border border-surface-2">
                    <Badge variant={inc.severity as any}>{inc.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{inc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(inc.created_at)}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded status-${inc.status}`}>
                      {inc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
