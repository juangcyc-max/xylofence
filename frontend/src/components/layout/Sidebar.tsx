import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Shield, Server, Users, Globe,
  ScanLine, AlertTriangle, FileText, LogOut, Monitor,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const vpnLinks = [
  { to: '/vpn/servers',  label: 'Servidores',   icon: Server },
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

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: React.ElementType }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-surface border-r border-surface-2 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-2">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-bold text-white text-sm tracking-wide">XYLOFENCE</p>
          <p className="text-xs text-slate-500">Cybersecurity</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-2'
              )
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>
        </div>

        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-accent uppercase tracking-wider">VPN</p>
          <div className="space-y-0.5">
            {vpnLinks.map(l => <NavItem key={l.to} to={l.to} label={l.label} Icon={l.icon} />)}
          </div>
        </div>

        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-accent uppercase tracking-wider">Seguridad</p>
          <div className="space-y-0.5">
            {secLinks.map(l => <NavItem key={l.to} to={l.to} label={l.label} Icon={l.icon} />)}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-surface-2">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-2 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold">
              {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role}</p>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
