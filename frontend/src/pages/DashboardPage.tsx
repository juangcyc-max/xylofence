import type { CSSProperties } from 'react'
import { Shield, Server, Globe, AlertTriangle, ScanLine, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useServers, usePeers, useIncidents, useAssets, useScans } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const BARLOW: CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }
const GOLD = '#CA8A04'
const TEAL = '#0891B2'
const NAVY = '#0A2540'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#2563eb',
  info:     '#94a3b8',
}

const STATS_CONFIG = [
  { label: 'Servidores VPN',     icon: Server,        color: TEAL,  key: 'servers' },
  { label: 'Peers activos',       icon: Globe,         color: GOLD,  key: 'peers' },
  { label: 'Activos web',         icon: Shield,        color: TEAL,  key: 'assets' },
  { label: 'Escaneos',            icon: ScanLine,      color: GOLD,  key: 'scans' },
  { label: 'Incidentes abiertos', icon: AlertTriangle, color: '#dc2626', key: 'incidents' },
] as const

function StatCard({ label, icon: Icon, color, value }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  label: string; icon: any; color: string; value: number
}) {
  return (
    <Card accent="none" style={{ borderTop: `2px solid ${color}` }}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">{label}</p>
            <p style={{ ...BARLOW, fontSize: 34, color: NAVY, lineHeight: 1.1, marginTop: 4 }}>{value}</p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function IncidentRow({ inc }: { inc: any }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
      <Badge variant={inc.severity}>{inc.severity}</Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-medium truncate">{inc.title}</p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{formatDate(inc.created_at)}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-md font-medium status-${inc.status}`}>
        {inc.status}
      </span>
    </div>
  )
}

export function DashboardPage() {
  const { data: servers   = [] } = useServers()
  const { data: peers     = [] } = usePeers()
  const { data: incidents = [] } = useIncidents()
  const { data: assets    = [] } = useAssets()
  const { data: scans     = [] } = useScans()

  const activePeers   = (peers as any[]).filter((p: any) => !p.revoked).length
  const openIncidents = (incidents as any[]).filter((i: any) => i.status === 'open').length

  const statValues: Record<string, number> = {
    servers:   (servers as any[]).length,
    peers:     activePeers,
    assets:    (assets as any[]).length,
    scans:     (scans as any[]).length,
    incidents: openIncidents,
  }

  const sevCounts = ['critical', 'high', 'medium', 'low', 'info'].map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: (incidents as any[]).filter((i: any) => i.severity === sev).length,
    sev,
  }))

  const recentIncidents = [...(incidents as any[])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-0.5 w-8 rounded-full" style={{ background: GOLD }} />
          <div className="h-0.5 w-3 rounded-full" style={{ background: TEAL }} />
        </div>
        <h1 style={{ ...BARLOW, fontSize: 28, letterSpacing: '0.04em', color: NAVY }} className="uppercase">
          Dashboard
        </h1>
        <p className="text-slate-400 text-xs mt-1 font-mono">// Resumen de la plataforma Xylofence</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATS_CONFIG.map(({ key, ...s }) => (
          <StatCard key={key} {...s} value={statValues[key]} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card accent="accent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: TEAL }} />
              Incidentes por severidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sevCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                  labelStyle={{ color: '#1e293b', fontWeight: 600 }}
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

        <Card accent="primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Incidentes recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8 font-mono">// sin incidentes registrados</p>
            ) : (
              <div className="space-y-2">
                {recentIncidents.map((inc: any) => (
                  <IncidentRow key={inc.id} inc={inc} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
