import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useVpnRegions, useProvisionNode } from '@/hooks/useVpnNodes'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', DE: '🇩🇪', JP: '🇯🇵', GB: '🇬🇧', FR: '🇫🇷', NL: '🇳🇱',
  SG: '🇸🇬', AU: '🇦🇺', CA: '🇨🇦', BR: '🇧🇷', IN: '🇮🇳', KR: '🇰🇷',
  SE: '🇸🇪', NO: '🇳🇴', FI: '🇫🇮', PL: '🇵🇱', CZ: '🇨🇿', ES: '🇪🇸',
  MX: '🇲🇽', AR: '🇦🇷', ZA: '🇿🇦', IL: '🇮🇱', AE: '🇦🇪',
}

const GOLD = '#CA8A04'

interface Region {
  id: string
  city: string
  country: string
  continent: string
}

interface DeployingState {
  regionId: string
  name: string
}

function RegionTile({ region, onDeploy }: { region: Region; onDeploy: (r: Region) => void }) {
  const flag = COUNTRY_FLAGS[region.country] ?? '🌐'
  return (
    <button
      onClick={() => onDeploy(region)}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all group text-center"
    >
      <span className="text-2xl">{flag}</span>
      <span className="text-xs font-medium text-slate-700 group-hover:text-yellow-700 leading-tight">{region.city}</span>
      <span className="text-[10px] text-slate-400">{region.country}</span>
    </button>
  )
}

function DeployModal({ region, onConfirm, onCancel, isPending }: {
  region: Region
  onConfirm: (name: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const flag = COUNTRY_FLAGS[region.country] ?? '🌐'
  const [name, setName] = useState(`vpn-${region.id}`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="text-center mb-5">
          <span className="text-4xl">{flag}</span>
          <h3 className="mt-2 text-lg font-bold text-slate-800">Desplegar en {region.city}</h3>
          <p className="text-sm text-slate-500 mt-1">Se creará un VPS con WireGuard en ~2 min</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nombre del nodo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(name)}
              disabled={isPending || !name.trim()}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: GOLD }}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Desplegar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RegionPicker() {
  const { data: regions = [], isLoading } = useVpnRegions()
  const provision = useProvisionNode()
  const [selected, setSelected] = useState<Region | null>(null)

  const handleConfirm = async (name: string) => {
    if (!selected) return
    await provision.mutateAsync({ region: selected.id, name })
    setSelected(null)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-12 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando regiones...
    </div>
  )

  const byContinent = (regions as Region[]).reduce<Record<string, Region[]>>((acc, r) => {
    const key = r.continent || 'Otros'
    acc[key] = [...(acc[key] ?? []), r]
    return acc
  }, {})

  return (
    <>
      {Object.entries(byContinent).map(([continent, regs]) => (
        <div key={continent} className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{continent}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {regs.map(r => (
              <RegionTile key={r.id} region={r} onDeploy={setSelected} />
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <DeployModal
          region={selected}
          onConfirm={handleConfirm}
          onCancel={() => setSelected(null)}
          isPending={provision.isPending}
        />
      )}
    </>
  )
}
