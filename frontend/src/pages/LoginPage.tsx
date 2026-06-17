import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const BARLOW: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 800,
}
const GOLD  = '#CA8A04'
const TEAL  = '#0891B2'
const NAVY  = '#0A2540'

// ── Binary rain ───────────────────────────────────────────────────────────────

type Ghost = { col: number; y: number; name: string }

function BinaryRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const CELL   = 16
    const cols   = Math.floor(canvas.width / CELL)
    const drops  = Array.from({ length: cols }, () => Math.random() * -100)
    const chars  = '01アイウエオカキクケコ0110'
    const names  = ['ALBA', 'GENOVEVA']
    const ghosts: Ghost[] = []
    let nameIdx  = 0

    const spawnGhost = () => {
      const name     = names[nameIdx++ % names.length]
      const startCol = 2 + Math.floor(Math.random() * Math.max(1, cols - name.length - 4))
      ghosts.push({ col: startCol, y: -2, name })
    }

    const t1 = setTimeout(spawnGhost, 6000)
    const t2 = setInterval(spawnGhost, 9000)

    const draw = () => {
      ctx.fillStyle = 'rgba(5,20,40,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `13px "JetBrains Mono", monospace`

      drops.forEach((y, i) => {
        const alpha = Math.min(1, y / (canvas.height / 14))
        ctx.fillStyle = i % 5 === 0
          ? `rgba(8,145,178,${alpha * 0.8})`
          : `rgba(202,138,4,${alpha * 0.5})`
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * CELL, y * 14)
        drops[i] = (y * 14 > canvas.height && Math.random() > 0.975) ? 0 : y + 0.5
      })

      for (let gi = ghosts.length - 1; gi >= 0; gi--) {
        const g  = ghosts[gi]
        const py = g.y * 14
        if (py >= 0) {
          ctx.fillStyle = 'rgba(255,215,50,0.9)'
          for (let ci = 0; ci < g.name.length; ci++)
            ctx.fillText(g.name[ci], (g.col + ci) * CELL, py)
        }
        g.y += 0.5
        if (py > canvas.height) ghosts.splice(gi, 1)
      }
    }

    const id = setInterval(draw, 40)
    return () => { clearInterval(id); clearTimeout(t1); clearInterval(t2) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ── Hero panel ────────────────────────────────────────────────────────────────

const FEATURES = ['VPN WireGuard', 'Auditoría web', 'Escáner de hosts', 'Gestión de incidentes']

function HeroPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden"
      style={{ background: '#051428' }}>
      <BinaryRain />

      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(8,145,178,0.12)' }} />
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(202,138,4,0.10)' }} />

      <div className="relative z-10 flex items-center gap-3 p-8">
        <img src="/logoxylofence.png" alt="Xylofence" className="h-10 w-10 rounded-xl object-contain" />
        <div>
          <p style={{ ...BARLOW, letterSpacing: '0.08em' }} className="text-white text-base uppercase">Xylofence</p>
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: GOLD }}>Cybersecurity</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-12 gap-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-80 h-80 rounded-full blur-3xl"
            style={{ background: 'rgba(202,138,4,0.28)' }} />
          <div className="relative w-64 h-64 rounded-full flex items-center justify-center overflow-visible"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 100%)',
              border: '2px solid rgba(202,138,4,0.45)',
              boxShadow: '0 0 50px rgba(202,138,4,0.25), inset 0 0 40px rgba(255,255,255,0.08)',
            }}>
            <img src="/logoxylofence.png" alt="Xylofence"
              className="w-[340px] h-[340px] object-contain -translate-y-[15px] scale-[1.55]"
              style={{ filter: 'drop-shadow(0 0 24px rgba(202,138,4,0.7)) brightness(1.2)' }}
            />
          </div>
        </div>

        <div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
            className="text-5xl leading-none uppercase">
            <span style={{
              background: 'linear-gradient(135deg,#ffffff 0%,#b2e8f0 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              CIBERSEGURIDAD<br />QUE CRECE CONTIGO.
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-5 leading-relaxed">
            Protección integral, inteligente y orgánica<br />para tu ecosistema digital.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-2 p-8 justify-center">
        {FEATURES.map(t => (
          <span key={t} className="text-xs px-3 py-1.5 rounded-full font-medium border"
            style={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Login form ────────────────────────────────────────────────────────────────

interface LoginFormProps {
  email: string; password: string; error: string; loading: boolean
  onEmail: (v: string) => void; onPassword: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

function LoginForm({ email, password, error, loading, onEmail, onPassword, onSubmit }: LoginFormProps) {
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col bg-white relative">
      <div className="h-1 bg-gradient-to-r from-[#CA8A04] via-[#0891B2] to-[#CA8A04]" />

      <div className="px-8 pt-5">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#0891B2] transition-colors font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 pb-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/logoxylofence.png" alt="Xylofence" className="h-10 w-10 object-contain rounded-xl" />
            <div>
              <p style={BARLOW} className="text-slate-800 text-lg tracking-widest uppercase">Xylofence</p>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: TEAL }}>Cybersecurity</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-1.5 mb-4">
              <div className="h-0.5 w-8 rounded-full" style={{ background: GOLD }} />
              <div className="h-0.5 w-3 rounded-full" style={{ background: TEAL }} />
            </div>
            <h1 style={{ ...BARLOW, letterSpacing: '0.02em', color: NAVY }} className="text-3xl uppercase">
              Iniciar sesión
            </h1>
            <p className="text-slate-400 text-sm mt-1">Accede a tu panel de seguridad</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {(['email', 'password'] as const).map(field => (
              <div key={field} className="space-y-1.5">
                <label htmlFor={field} className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  {field === 'email' ? 'Email' : 'Contraseña'}
                </label>
                <input
                  id={field}
                  type={field}
                  placeholder={field === 'email' ? 'admin@xylofence.com' : '••••••••'}
                  value={field === 'email' ? email : password}
                  onChange={e => field === 'email' ? onEmail(e.target.value) : onPassword(e.target.value)}
                  required
                  autoFocus={field === 'email'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] transition-colors"
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button type="submit" disabled={loading}
              style={{ ...BARLOW, letterSpacing: '0.1em', background: NAVY }}
              className="w-full text-white py-3 rounded-xl text-sm uppercase hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? 'Autenticando...' : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Entrar al sistema
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-300 font-mono mt-10 text-center">
            xylofence.blockself.net · v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { setAuth }             = useAuthStore()
  const navigate                = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    let token: string
    try {
      const res = await authApi.login(email, password)
      token = res.data.access_token
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      setError(
        status === 401 || status === 403 ? 'Email o contraseña incorrectos.' :
        typeof detail === 'string'       ? detail :
        'No se pudo conectar con el servidor.'
      )
      setLoading(false)
      return
    }
    localStorage.setItem('xylofence_token', token)
    try { const r = await authApi.me(); setAuth(token, r.data) }
    catch { setAuth(token, { id: 0, email, full_name: email, role: 'admin', is_active: true }) }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex">
      <HeroPanel />
      <LoginForm
        email={email} password={password} error={error} loading={loading}
        onEmail={setEmail} onPassword={setPassword} onSubmit={handleSubmit}
      />
    </div>
  )
}
