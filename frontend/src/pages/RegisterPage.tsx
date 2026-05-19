import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'
import { useValidateInvitation, useRegister } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const GOLD = '#CA8A04'
const TEAL = '#0891B2'
const NAVY = '#0A2540'

const ROLE_LABELS: Record<string, string> = {
  client: 'Cliente',
  viewer: 'Visor',
  manager: 'Manager',
  admin: 'Admin',
}

export function RegisterPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { data: invitation, isLoading: validating, isError, error } = useValidateInvitation(token)
  const register = useRegister()

  const [form, setForm] = useState({ full_name: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (form.password !== form.confirm) {
      setFormError('Las contraseñas no coinciden')
      return
    }
    try {
      await register.mutateAsync({ token, full_name: form.full_name, password: form.password })
      navigate('/login?registered=1')
    } catch (err: any) {
      setFormError(err.response?.data?.detail ?? 'Error al registrarse')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
      <div className="w-full max-w-md px-4">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center gap-3">
            <img src="/logoxylofence.png" alt="Xylofence" className="h-12 w-12 rounded-xl object-contain" />
            <div>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.08em', color: '#fff', fontSize: '1.4rem' }}>
                XYLOFENCE
              </p>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: TEAL }}>Cybersecurity</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-8 space-y-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {validating ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <p className="text-slate-400">Verificando invitación...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-8 space-y-3">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
              <p className="text-white font-semibold text-lg">Invitación no válida</p>
              <p className="text-slate-400 text-sm">
                {(error as any)?.response?.data?.detail ?? 'Este link ha expirado o ya fue usado.'}
              </p>
              <Link to="/login" className="text-sm underline" style={{ color: GOLD }}>
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              {/* Cabecera */}
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-white">Crear tu cuenta</h1>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <span>
                    Invitado como <strong style={{ color: GOLD }}>{ROLE_LABELS[invitation?.role ?? 'client'] ?? invitation?.role}</strong>
                    {invitation?.email && <> · {invitation.email}</>}
                  </span>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nombre completo</Label>
                  <Input
                    placeholder="Ana García"
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    required
                    minLength={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="mínimo 8 caracteres"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Confirmar contraseña</Label>
                  <Input
                    type="password"
                    placeholder="repite la contraseña"
                    value={form.confirm}
                    onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                    required
                  />
                </div>

                {formError && (
                  <p className="text-red-400 text-sm flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> {formError}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={register.isPending}>
                  {register.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creando cuenta...</>
                  ) : 'Crear cuenta'}
                </Button>
              </form>

              <p className="text-center text-xs text-slate-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="underline" style={{ color: GOLD }}>Inicia sesión</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
