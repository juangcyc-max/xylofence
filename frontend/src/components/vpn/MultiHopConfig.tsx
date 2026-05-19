import { useState } from 'react'
import { GitMerge, Loader2, X, Check } from 'lucide-react'
import { useNodeChain, useSetChain, useRemoveChain } from '@/hooks/useVpnNodes'

const PURPLE = '#7C3AED'

interface Node {
  id: number
  region_city: string
  status: string
  ip_address: string | null
}

interface Props {
  nodeId: number
  allNodes: Node[]
}

export function MultiHopConfig({ nodeId, allNodes }: Props) {
  const { data: chain, isLoading } = useNodeChain(nodeId)
  const setChain = useSetChain(nodeId)
  const removeChain = useRemoveChain(nodeId)
  const [selectedExit, setSelectedExit] = useState('')

  const availableExits = allNodes.filter(
    n => n.id !== nodeId && n.status === 'active' && n.ip_address,
  )

  if (isLoading) return null

  return (
    <div className="border-t border-slate-100 pt-3 mt-1">
      <div className="flex items-center gap-1.5 mb-2">
        <GitMerge className="h-3 w-3" style={{ color: PURPLE }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: PURPLE }}>
          Multi-Hop
        </span>
        {chain && (
          <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 font-semibold">
            → {chain.exit_city}
          </span>
        )}
      </div>

      {chain ? (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-mono">
            Tráfico: este nodo → <strong>{chain.exit_city}</strong> → Internet
          </p>
          <button
            onClick={() => removeChain.mutate()}
            disabled={removeChain.isPending}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {removeChain.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <X className="h-3 w-3" />}
            {removeChain.isPending ? 'Desactivando...' : 'Desactivar cadena'}
          </button>
        </div>
      ) : availableExits.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic">
          Necesitas 2+ nodos activos para multi-hop.
        </p>
      ) : (
        <div className="flex gap-1.5">
          <select
            value={selectedExit}
            onChange={e => setSelectedExit(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white min-w-0"
          >
            <option value="">Nodo de salida...</option>
            {availableExits.map(n => (
              <option key={n.id} value={n.id}>
                {n.region_city}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedExit && setChain.mutate(Number(selectedExit))}
            disabled={!selectedExit || setChain.isPending}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition-opacity"
            style={{ background: PURPLE }}
          >
            {setChain.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Check className="h-3 w-3" />}
            {setChain.isPending ? '...' : 'OK'}
          </button>
        </div>
      )}
    </div>
  )
}
