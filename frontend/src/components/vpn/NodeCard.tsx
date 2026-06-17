import { useState } from 'react'
import { Trash2, Loader2, CheckCircle2, Globe, Download } from 'lucide-react'
import { useDestroyNode } from '@/hooks/useVpnNodes'
import { vpnNodesApi } from '@/lib/api'
import { XrayConnect } from './XrayConnect'
import { MultiHopConfig } from './MultiHopConfig'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', DE: '🇩🇪', JP: '🇯🇵', GB: '🇬🇧', FR: '🇫🇷', NL: '🇳🇱',
  SG: '🇸🇬', AU: '🇦🇺', CA: '🇨🇦', BR: '🇧🇷', IN: '🇮🇳', KR: '🇰🇷',
  SE: '🇸🇪', NO: '🇳🇴', FI: '🇫🇮', PL: '🇵🇱', CZ: '🇨🇿', ES: '🇪🇸',
  MX: '🇲🇽', AR: '🇦🇷', ZA: '🇿🇦', IL: '🇮🇱', AE: '🇦🇪',
}

const GOLD = '#CA8A04'
const TEAL = '#0891B2'

interface Node {
  id: number
  region: string
  region_city: string
  region_country: string
  status: string
  ip_address: string | null
  plan: string
}

export function NodeCard({ node, allNodes }: { node: Node; allNodes: Node[] }) {
  const destroy = useDestroyNode()
  const [downloading, setDownloading] = useState(false)
  const isProvisioning = node.status !== 'active'
  const flag = COUNTRY_FLAGS[node.region_country] ?? '🌐'

  const handleDestroy = () => {
    if (confirm(`¿Destruir el nodo VPN en ${node.region_city}? Esta acción es irreversible.`)) {
      destroy.mutate(node.id)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await vpnNodesApi.clientConfig(node.id)
      const blob = new Blob([res.data as string], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `xylofence-${node.region.toLowerCase()}.conf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al obtener la configuración. Inténtalo de nuevo.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3"
      style={{ borderTop: `3px solid ${isProvisioning ? TEAL : GOLD}` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{flag}</span>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{node.region_city}</p>
            <p className="text-xs text-slate-400 font-mono">{node.region_country} · {node.plan}</p>
          </div>
        </div>
        <button
          onClick={handleDestroy}
          disabled={destroy.isPending}
          className="text-slate-400 hover:text-red-500 transition-colors"
          title="Destruir nodo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isProvisioning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: TEAL }} />
            <span className="text-xs font-medium" style={{ color: TEAL }}>Provisionando...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} />
            <span className="text-xs font-medium" style={{ color: GOLD }}>Activo</span>
          </>
        )}
      </div>

      <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
        <Globe className="h-3 w-3" />
        {node.ip_address ?? '—'}
      </div>

      {!isProvisioning && (
        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: GOLD }}
          >
            {downloading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Download className="h-3 w-3" />}
            {downloading ? 'Descargando...' : 'WireGuard config'}
          </button>
          <XrayConnect nodeId={node.id} city={node.region_city} />
          <MultiHopConfig nodeId={node.id} allNodes={allNodes} />
        </div>
      )}
    </div>
  )
}
