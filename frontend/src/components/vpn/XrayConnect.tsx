import { useState } from 'react'
import { Shield, Copy, Check, Loader2, ExternalLink } from 'lucide-react'
import { vpnNodesApi } from '@/lib/api'

const TEAL = '#0891B2'

interface Props {
  nodeId: number
  city: string
}

export function XrayConnect({ nodeId, city }: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleLoad = async () => {
    if (link) { setOpen(true); return }
    setLoading(true)
    try {
      const res = await vpnNodesApi.xrayLink(nodeId)
      setLink(res.data.link)
      setOpen(true)
    } catch {
      alert('Xray no disponible en este nodo. Redespliega el nodo para activarlo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={handleLoad}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white transition-opacity disabled:opacity-60"
        style={{ background: TEAL }}
      >
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Shield className="h-3 w-3" />}
        {loading ? 'Cargando...' : 'Conectar con Xray (REALITY)'}
      </button>

      {open && link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" style={{ color: TEAL }} />
              <h3 className="font-bold text-slate-800">Xray REALITY — {city}</h3>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p>
                El tráfico se disfraza como HTTPS de <strong>Microsoft</strong> — prácticamente indetectable.
              </p>

              <div>
                <p className="font-semibold text-slate-700 mb-1">1. Instala v2rayN (Windows)</p>
                <a
                  href="https://github.com/2dust/v2rayN/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  github.com/2dust/v2rayN/releases <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-2">2. Copia este link e impiortalo en v2rayN</p>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-[10px] font-mono break-all text-slate-500 select-all">{link}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                <strong>En v2rayN:</strong> Ctrl+V o botón "Import from clipboard" → selecciona el servidor → click "Set as active"
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
