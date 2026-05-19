import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAuditLogs } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function AuditPage() {
  const { data: logs = [], isLoading } = useAuditLogs(200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent" /> Auditoría
        </h1>
        <p className="text-slate-400 text-sm mt-1">Registro de acciones en la plataforma</p>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-2 text-left">
                  {['Acción', 'Tipo', 'ID', 'Detalle', 'Actor', 'Fecha'].map(h => (
                    <th key={h} className="px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {(logs as any[]).map((l: any) => (
                  <tr key={l.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-accent">{l.action}</td>
                    <td className="px-4 py-3 text-slate-400">{l.target_type}</td>
                    <td className="px-4 py-3 text-slate-500">{l.target_id ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{l.detail ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{l.actor_user_id ?? 'sistema'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(logs as any[]).length === 0 && (
              <p className="text-slate-500 text-center py-12">Sin registros</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
