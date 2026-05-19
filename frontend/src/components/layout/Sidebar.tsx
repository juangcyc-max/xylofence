import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Server, Users, Globe,
  ScanLine, AlertTriangle, FileText, LogOut, Monitor, Cloud,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const GOLD = '#CA8A04'
const TEAL = '#0891B2'
const BG   = '#0D2137'

const vpnLinks = [
  { to: '/vpn/servers',  label: 'Servidores',   icon: Server },
  { to: '/vpn/cloud',    label: 'Cloud VPN',    icon: Cloud },
  { to: '/vpn/peers',    label: 'Dispositivos',  icon: Globe },
  { to: '/vpn/users',    label: 'Usuarios',      icon: Users },
  { to: '/vpn/audit',    label: 'Auditoría',     icon: FileText },
]

const secLinks = [
  { to: '/security/assets',      label: 'Activos web',    icon: Globe },
  { to: '/security/scans',       label: 'Escaneos web',   icon: ScanLine },
  { to: '/security/incidents',   label: 'Incidentes',     icon: AlertTriangle },
  { to: '/security/host-scans',  label: 'Escáner host',   icon: Monitor },
]

// ── Lluvia binaria ────────────────────────────────────────────────────────────

function SidebarRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const CELL  = 12
    const cols  = Math.floor(canvas.width / CELL)
    const drops = Array.from({ length: cols }, () => Math.random() * -80)

    const draw = () => {
      ctx.fillStyle = `rgba(${parseInt(BG.slice(1,3),16)},${parseInt(BG.slice(3,5),16)},${parseInt(BG.slice(5,7),16)},0.05)`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `10px "JetBrains Mono", monospace`

      drops.forEach((y, i) => {
        const alpha = Math.min(1, y / (canvas.height / CELL)) * 0.45
        ctx.fillStyle = i % 4 === 0
          ? `rgba(8,145,178,${alpha})`
          : `rgba(202,138,4,${alpha * 0.7})`
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', i * CELL, y * CELL)
        drops[i] = (y * CELL > canvas.height && Math.random() > 0.975) ? 0 : y + 0.4
      })
    }

    const id = setInterval(draw, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: React.ElementType }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative z-10 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group',
          isActive ? 'font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
        )
      }
      style={({ isActive }) => isActive ? {
        color: GOLD,
        background: 'rgba(202,138,4,0.10)',
        borderLeft: `2px solid ${GOLD}`,
        paddingLeft: '10px',
      } : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('h-4 w-4 shrink-0 transition-colors',
              isActive ? '' : 'text-slate-600 group-hover:text-slate-300')}
            style={isActive ? { color: GOLD } : undefined}
          />
          {label}
        </>
      )}
    </NavLink>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const clientLinks = [
  { to: '/my',         label: 'Mi Panel',      icon: LayoutDashboard },
  { to: '/vpn/peers',  label: 'Mis dispositivos', icon: Globe },
]

export function Sidebar() {
  const { user, logout, isClient } = useAuthStore()
  const client = isClient()

  return (
    <aside
      className="relative flex flex-col w-60 shrink-0 h-screen sticky top-0 overflow-hidden"
      style={{ background: BG, borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      <SidebarRain />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <img src="/logoxylofence.png" alt="Xylofence" className="h-10 w-10 rounded-xl object-contain" />
        <div>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.08em' }}
            className="text-white text-base uppercase">Xylofence</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="pulse-dot" style={{ background: TEAL }} />
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: TEAL }}>Cybersecurity</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {client ? (
          <div className="space-y-0.5">
            {clientLinks.map(l => <NavItem key={l.to} to={l.to} label={l.label} Icon={l.icon} />)}
          </div>
        ) : (
          <>
            <div>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group',
                    isActive ? 'font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5')
                }
                style={({ isActive }) => isActive ? {
                  color: GOLD,
                  background: 'rgba(202,138,4,0.10)',
                  borderLeft: `2px solid ${GOLD}`,
                  paddingLeft: '10px',
                } : undefined}
              >
                {({ isActive }) => (
                  <>
                    <LayoutDashboard
                      className={cn('h-4 w-4 shrink-0', isActive ? '' : 'text-slate-600')}
                      style={isActive ? { color: GOLD } : undefined}
                    />
                    Dashboard
                  </>
                )}
              </NavLink>
            </div>

            <div>
              <div className="section-header px-3 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">VPN</p>
              </div>
              <div className="space-y-0.5">
                {vpnLinks.map(l => <NavItem key={l.to} to={l.to} label={l.label} Icon={l.icon} />)}
              </div>
            </div>

            <div>
              <div className="section-header px-3 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Seguridad</p>
              </div>
              <div className="space-y-0.5">
                {secLinks.map(l => <NavItem key={l.to} to={l.to} label={l.label} Icon={l.icon} />)}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Divider */}
      <div className="relative z-10 h-px mx-4"
        style={{ background: 'linear-gradient(to right, rgba(202,138,4,0.3), rgba(8,145,178,0.3), transparent)' }} />

      {/* User */}
      <div className="relative z-10 px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.3)' }}>
            <span className="text-xs font-bold font-mono" style={{ color: GOLD }}>
              {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-600 font-mono truncate">{user?.role}</p>
          </div>
          <button onClick={logout} className="text-slate-600 hover:text-red-400 transition-colors" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
