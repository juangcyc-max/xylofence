import { useState } from 'react'
import { Globe, Plus, Trash2, ShieldCheck, ShieldOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAssets, useCreateAsset, useDeleteAsset } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function AssetsPage() {
  const { data: assets = [], isLoading } = useAssets()
  const createAsset = useCreateAsset()
  const deleteAsset = useDeleteAsset()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', base_url: '', environment: 'produccion',
    owner: '', authorized: false,
  })
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (form.name.trim().length < 2) { setFormError('El nombre debe tener al menos 2 caracteres.'); return }
    if (!form.base_url.startsWith('http')) { setFormError('La URL debe empezar por http:// o https://'); return }
    try {
      await createAsset.mutateAsync(form)
      setShowForm(false)
      setForm({ name: '', base_url: '', environment: 'produccion', owner: '', authorized: false })
      setFormError('')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setFormError(typeof detail === 'string' ? detail : 'Error al registrar el activo.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-accent" /> Activos web
          </h1>
          <p className="text-slate-400 text-sm mt-1">Activos auditables registrados</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="accent">
          <Plus className="h-4 w-4" /> Nuevo activo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Registrar activo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Nombre', placeholder: 'Portal de empleados' },
                { key: 'base_url', label: 'URL base', placeholder: 'https://portal.empresa.com' },
                { key: 'environment', label: 'Entorno', placeholder: 'production / staging / lab' },
                { key: 'owner', label: 'Propietario', placeholder: 'equipo-ti' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
              {formError && (
                <p className="col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="authorized" checked={form.authorized}
                  onChange={e => setForm(prev => ({ ...prev, authorized: e.target.checked }))}
                  className="accent-primary h-4 w-4" />
                <Label htmlFor="authorized" className="cursor-pointer">
                  Autorizado para escaneo (confirmo que tengo permiso explícito)
                </Label>
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={createAsset.isPending || !form.authorized}>{createAsset.isPending ? 'Guardando...' : 'Registrar activo'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-center py-12">Cargando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(assets as any[]).map((a: any) => (
            <Card key={a.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-100 truncate">{a.name}</p>
                  {a.authorized
                    ? <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />
                    : <ShieldOff className="h-4 w-4 text-slate-500 shrink-0" />}
                </div>
                <p className="text-xs font-mono text-accent truncate">{a.base_url}</p>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Entorno: <span className="text-slate-300">{a.environment}</span></p>
                  <p>Propietario: <span className="text-slate-300">{a.owner ?? '—'}</span></p>
                  <p className="text-slate-500">{formatDate(a.created_at)}</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => deleteAsset.mutate(a.id)}
                  className="w-full gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}
          {(assets as any[]).length === 0 && (
            <p className="text-slate-500 col-span-full text-center py-12">Sin activos registrados</p>
          )}
        </div>
      )}
    </div>
  )
}
