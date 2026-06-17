import { Cloud } from 'lucide-react'
import { NodeCard } from '@/components/vpn/NodeCard'
import { RegionPicker } from '@/components/vpn/RegionPicker'
import { useVpnNodes } from '@/hooks/useVpnNodes'

const GOLD = '#CA8A04'
const NAVY = '#0A2540'
const BARLOW = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }

export function CloudVpnPage() {
  const { data: nodes = [] } = useVpnNodes()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl uppercase flex items-center gap-2" style={{ ...BARLOW, color: NAVY }}>
          <Cloud className="h-6 w-6" style={{ color: GOLD }} />
          Nodos VPN Cloud
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-mono">// Servidores WireGuard en la nube</p>
      </div>

      {(nodes as any[]).length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Nodos activos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {(nodes as any[]).map((node: any) => (
              <NodeCard key={node.id} node={node} allNodes={nodes as any[]} />
            ))}
          </div>
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
