import { useState, useEffect } from 'react'
import { Loader2, Monitor, Globe, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { vpnNodesApi } from '@/lib/api'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', DE: '🇩🇪', JP: '🇯🇵', GB: '🇬🇧', FR: '🇫🇷', NL: '🇳🇱',
  SG: '🇸🇬', AU: '🇦🇺', CA: '🇨🇦', BR: '🇧🇷', IN: '🇮🇳', KR: '🇰🇷',
  SE: '🇸🇪', NO: '🇳🇴', FI: '🇫🇮', PL: '🇵🇱', ES: '🇪🇸', MX: '🇲🇽',
}

interface Node {
  id: number
  region_city: string
  region_country: string
  status: string
  ip_address: string | null
}

function NodeBox({
  node, index, total, onRemove, onMoveLeft, onMoveRight,
}: {
  node: Node; index: number; total: number
  onRemove: () => void; onMoveLeft: () => void; onMoveRight: () => void
}) {
  const flag = COUNTRY_FLAGS[node.region_country] ?? '🌐'
  const isExit = index === total - 1
  const isEntry = index === 0

  return (
    <div className="flex items-center gap-0">
      {/* Arrow connector */}
      {index > 0 && (
        <div className="flex items-center px-1">
          <div className="w-8 h-px bg-orange-400 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-orange-400" />
          </div>
        </div>
      )}

      {/* Node card */}
      <div className="relative group flex flex-col items-center">
        <div
          className="w-20 rounded-lg border-2 overflow-hidden"
          style={{
            background: '#1e1e2e',
            borderColor: isExit ? '#f59e0b' : isEntry ? '#a855f7' : '#6366f1',
          }}
        >
          {/* Header with number */}
          <div
            className="flex items-center justify-between px-2 py-1"
            style={{ background: isExit ? '#78350f' : isEntry ? '#4c1d95' : '#312e81' }}
          >
            <span className="text-[9px] font-bold text-white/60 uppercase">
              {isEntry ? 'entrada' : isExit ? 'salida' : `hop ${index + 1}`}
            </span>
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: isExit ? '#f59e0b' : isEntry ? '#a855f7' : '#6366f1' }}
            >
              {index + 1}
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center py-2 px-1 gap-1">
            <span className="text-xl leading-none">{flag}</span>
            <span className="text-[10px] font-bold text-white text-center leading-tight">
              {node.region_city}
            </span>
            <span className="text-[8px] text-white/40 font-mono">{node.region_country}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveLeft}
            disabled={index === 0}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={onRemove}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveRight}
            disabled={index === total - 1}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ChainBuilder({ nodes }: { nodes: Node[] }) {
  const activeNodes = nodes.filter(n => n.status === 'active' && n.ip_address)
  const [chain, setChain] = useState<number[]>([])
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const qc = useQueryClient()

  const { data: activeChain } = useQuery({
    queryKey: ['vpn-nodes-chain-active'],
    queryFn: () => vpnNodesApi.getActiveChain().then(r => r.data),
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!initialized && activeChain?.chain && activeChain.chain.length >= 2) {
      const ids = activeChain.chain.map(n => n.id)
      const validIds = ids.filter(id => activeNodes.some(n => n.id === id))
      if (validIds.length >= 2) {
        setChain(validIds)
        setInitialized(true)
      }
    } else if (!initialized && activeChain !== undefined) {
      setInitialized(true)
    }
  }, [activeChain, activeNodes, initialized])

  const addNode = (id: number) => {
    if (!chain.includes(id)) setChain(prev => [...prev, id])
  }

  const removeNode = (id: number) => setChain(prev => prev.filter(n => n !== id))

  const moveLeft = (idx: number) => {
    if (idx === 0) return
    setChain(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveRight = (idx: number) => {
    setChain(prev => {
      if (idx === prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleApply = async () => {
    if (chain.length < 2) return
    setLoading(true)
    setSuccess(false)
    try {
      await vpnNodesApi.applyChain(chain)
      setSuccess(true)
      chain.forEach(id => qc.invalidateQueries({ queryKey: ['vpn-node-chain', id] }))
      qc.invalidateQueries({ queryKey: ['vpn-nodes-chain-active'] })
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? 'Error desconocido'
      alert(`Error configurando la cadena:\n${detail}`)
    } finally {
      setLoading(false)
    }
  }

  const getNode = (id: number) => activeNodes.find(n => n.id === id)!
  const entryNode = chain.length > 0 ? getNode(chain[0]) : null
  const exitNode = chain.length > 1 ? getNode(chain[chain.length - 1]) : null

  return (
    <div
      className="rounded-xl border border-slate-700 overflow-hidden"
      style={{ background: '#13131f' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/60">
        <Zap className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-bold text-white uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Constructor de Cadena Multi-Hop
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Available nodes */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Nodos disponibles — click para añadir
          </p>
          <div className="flex flex-wrap gap-2">
            {activeNodes.map(node => {
              const inChain = chain.includes(node.id)
              const flag = COUNTRY_FLAGS[node.region_country] ?? '🌐'
              return (
                <button
                  key={node.id}
                  onClick={() => inChain ? removeNode(node.id) : addNode(node.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all"
                  style={inChain
                    ? { borderColor: '#a855f7', background: '#2e1065', color: '#d8b4fe' }
                    : { borderColor: '#374151', background: '#1f2937', color: '#9ca3af' }
                  }
                >
                  <span>{flag}</span>
                  <span>{node.region_city}</span>
                  {inChain && <span className="text-purple-400 ml-0.5">✓</span>}
                </button>
              )
            })}
            {activeNodes.length === 0 && (
              <p className="text-xs text-slate-500 italic">No hay nodos activos aún...</p>
            )}
          </div>
        </div>

        {/* Chain canvas */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            Flujo de cadena
          </p>
          <div
            className="rounded-lg border border-slate-700/50 p-4 overflow-x-auto"
            style={{ background: '#0d0d1a', minHeight: 120 }}
          >
            <div className="flex items-start gap-0 min-w-max">
              {/* PC icon */}
              <div className="flex flex-col items-center mr-2">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-slate-600 flex items-center justify-center"
                  style={{ background: '#1e1e2e' }}
                >
                  <Monitor className="h-4 w-4 text-slate-400" />
                </div>
                <span className="text-[8px] text-slate-500 mt-1">TÚ</span>
              </div>

              {chain.length === 0 ? (
                <div className="flex items-center h-10 ml-4">
                  <p className="text-xs text-slate-600 italic">
                    Añade nodos arriba para construir la cadena...
                  </p>
                </div>
              ) : (
                chain.map((nodeId, idx) => (
                  <NodeBox
                    key={nodeId}
                    node={getNode(nodeId)}
                    index={idx}
                    total={chain.length}
                    onRemove={() => removeNode(nodeId)}
                    onMoveLeft={() => moveLeft(idx)}
                    onMoveRight={() => moveRight(idx)}
                  />
                ))
              )}

              {chain.length > 0 && (
                <>
                  <div className="flex items-center px-1 mt-2">
                    <div className="w-8 h-px bg-orange-400 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-orange-400" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-amber-600 flex items-center justify-center"
                      style={{ background: '#1e1e2e' }}
                    >
                      <Globe className="h-4 w-4 text-amber-400" />
                    </div>
                    <span className="text-[8px] text-amber-500 mt-1">INTERNET</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info + Apply */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-400">
            {chain.length >= 2 && entryNode && exitNode ? (
              <>
                Conecta en v2rayN a{' '}
                <span className="text-purple-400 font-semibold">{entryNode.region_city}</span>
                {' · '}IP final:{' '}
                <span className="text-amber-400 font-semibold">{exitNode.region_city}</span>
                {' · '}{chain.length} saltos
              </>
            ) : chain.length === 1 ? (
              <span className="text-slate-500">Añade al menos un nodo más</span>
            ) : (
              <span className="text-slate-500">Añade nodos para empezar</span>
            )}
          </div>

          <button
            onClick={handleApply}
            disabled={chain.length < 2 || loading}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: success ? '#16a34a' : '#7c3aed' }}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Zap className="h-4 w-4" />}
            {loading ? 'Configurando nodos...' : success ? '¡Cadena activa!' : `Activar cadena (${chain.length} saltos)`}
          </button>
        </div>
      </div>
    </div>
  )
}
