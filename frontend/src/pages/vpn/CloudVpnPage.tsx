import { useState } from 'react'
import { Cloud, Link, Check } from 'lucide-react'
import { NodeCard } from '@/components/vpn/NodeCard'
import { RegionPicker } from '@/components/vpn/RegionPicker'
import { ChainBuilder } from '@/components/vpn/ChainBuilder'
import { useVpnNodes } from '@/hooks/useVpnNodes'
import { vpnNodesApi } from '@/lib/api'

const GOLD = '#CA8A04'
const NAVY = '#0A2540'
const BARLOW = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }

export function CloudVpnPage() {
  const { data: nodes = [] } = useVpnNodes()
  const [copied, setCopied] = useState(false)

  const handleCopySubscription = () => {
    const url = vpnNodesApi.subscriptionUrl()
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl uppercase flex items-center gap-2" style={{ ...BARLOW, color: NAVY }}>
            <Cloud className="h-6 w-6" style={{ color: GOLD }} />
            Nodos VPN Cloud
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">// Servidores WireGuard en la nube</p>
        </div>
        <button
          onClick={handleCopySubscription}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold border transition-all"
          style={copied
            ? { borderColor: '#16a34a', background: '#052e16', color: '#86efac' }
            : { borderColor: '#334155', background: '#0f172a', color: '#94a3b8' }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5" />}
          {copied ? 'URL copiada!' : 'URL suscripción v2rayN'}
        </button>
      </div>

      {(nodes as any[]).length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Nodos activos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {(nodes as any[]).map((node: any) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </section>
      )}

      {(nodes as any[]).filter((n: any) => n.status === 'active').length >= 2 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Cadena multi-hop</p>
          <ChainBuilder nodes={nodes as any[]} />
        </section>
      )}

      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Desplegar en nueva región
        </p>
        <RegionPicker />
      </section>
    </div>
  )
}
