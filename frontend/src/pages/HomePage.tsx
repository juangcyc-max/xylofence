import { useNavigate } from 'react-router-dom'
import { useRef, useEffect } from 'react'

const CARDS = [
  {
    icon: '/lupaicono.png',
    title: 'Detección\nAvanzada',
    desc: 'Detección avanzada de amenazas utilizando inteligencia artificial para proteger tus activos más críticos en tiempo real.',
  },
  {
    icon: '/firewallicono.png',
    title: 'Seguridad\nDe Red',
    desc: 'Protección integral, inteligente y orgánica para toda la infraestructura de red, bloqueando accesos no autorizados.',
  },
  {
    icon: '/escudoymartillo.png',
    title: 'Cumplimiento &\nGobernanza',
    desc: 'Asegura que tu empresa cumpla con las normativas internacionales de protección de datos y privacidad sin esfuerzo.',
  },
]

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar({ onLogin }: { onLogin: () => void }) {
  return (
    <nav className="w-full bg-white flex items-center justify-between px-6 py-3 shadow-sm relative z-50">
      <div className="flex items-center gap-3">
        <img src="/logoxylofence.png" alt="Xylofence" className="h-12 w-12 object-contain" />
        <div className="flex flex-col justify-center">
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.04em' }} className="text-2xl leading-none text-[#0A2540]">XYLOFENCE</span>
          <span className="text-[10px] font-semibold text-gray-400 tracking-widest mt-0.5">CYBERSECURITY</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-[#0A2540]">
        {['INICIO', 'SOLUCIONES', 'TECNOLOGÍA', 'NOSOTROS', 'CONTACTO'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-yellow-500 transition-colors">
            {item}
          </a>
        ))}
      </div>

      <button
        onClick={onLogin}
        className="bg-[#FACC15] text-[#0A2540] font-bold text-sm px-6 py-2 rounded-full border-2 border-[#0A2540] hover:bg-yellow-400 transition-colors"
      >
        ACCEDER
      </button>
    </nav>
  )
}

// ── Hero title (binary rain clipped to text) ──────────────────────────────────

function HeroTitle() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let intervalId: ReturnType<typeof setInterval>

    const setup = (W: number, H: number) => {
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // font size que quepa en ancho Y alto
      ctx.font = `700 100px "Barlow Condensed", sans-serif`
      const longestW = ctx.measureText('QUE CRECE CONTIGO.').width
      const fs = Math.min((W * 0.97 / longestW) * 100, H / 2.25)

      const cSize = 12
      const cols  = Math.ceil(W / cSize)
      const rows  = H / cSize
      const drops = Array.from({ length: cols }, (_, i) =>
        i % 2 === 0 ? Math.random() * rows : -Math.random() * rows
      )

      clearInterval(intervalId)
      intervalId = setInterval(() => {
        ctx.clearRect(0, 0, W, H)

        // 1. dibujar texto base con gradiente (esto funciona confirmado)
        const grad = ctx.createLinearGradient(0, 0, W, H)
        grad.addColorStop(0, '#081B2E')
        grad.addColorStop(0.5, '#0D4A65')
        grad.addColorStop(1, '#1A7A96')
        ctx.font = `700 ${fs}px "Barlow Condensed", sans-serif`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.fillStyle = grad
        ctx.fillText('CIBERSEGURIDAD', W, 0)
        ctx.fillText('QUE CRECE CONTIGO.', W, fs * 1.1)

        // 2. source-atop: pinta los 0/1 SOLO donde ya existe el texto
        ctx.globalCompositeOperation = 'source-atop'
        ctx.font = `bold ${cSize}px "JetBrains Mono", monospace`
        drops.forEach((y, i) => {
          // rastro: 5 chars encima del cabezal, opacidad decreciente
          for (let t = 5; t >= 1; t--) {
            const ty = (y - t) * cSize
            if (ty < 0) continue
            ctx.fillStyle = `rgba(0, 210, 190, ${0.6 / t})`
            ctx.fillText(Math.random() > 0.5 ? '1' : '0', i * cSize, ty)
          }
          // cabezal brillante
          ctx.fillStyle = 'rgba(220, 255, 250, 0.95)'
          ctx.fillText(Math.random() > 0.5 ? '1' : '0', i * cSize, y * cSize)

          if (y > rows + 3 && Math.random() > 0.975) drops[i] = -Math.random() * rows
          else drops[i] += 0.45
        })
        ctx.globalCompositeOperation = 'source-over'
      }, 40)
    }

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        document.fonts.ready.then(() => setup(width, height))
        ro.disconnect()
      }
    })
    ro.observe(canvas)

    return () => {
      ro.disconnect()
      clearInterval(intervalId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 'clamp(90px, 13vw, 130px)', display: 'block' }}
    />
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <main
      className="relative w-full h-[470px] bg-cover bg-left overflow-hidden"
      style={{ backgroundImage: "url('/fondo-home-v2.png')" }}
    >
      {/* gradiente suave: transparente hasta el 55%, luego fade a blanco */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to right, transparent 45%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,0.85) 75%, white 88%)'
      }} />

      {/* texto flotando sobre el área clara */}
      <div className="relative h-full flex items-center">
        <div className="ml-[54%] w-[36%] text-right space-y-4">
          <HeroTitle />
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: '1.15rem', letterSpacing: '0.04em' }} className="text-slate-500">
            Protección integral, inteligente y orgánica<br />para tu ecosistema digital.
          </p>
          <div className="flex justify-end">
            <button
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.1em', fontSize: '0.9rem' }}
              className="bg-[#FACC15] text-[#0A2540] px-9 py-3 rounded-full border-2 border-[#0A2540] hover:bg-yellow-400 transition-colors shadow-md uppercase"
            >
              Explora Soluciones de Defensa
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Soluciones ────────────────────────────────────────────────────────────────

const SOLUCIONES = [
  {
    icon: '🔒',
    title: 'VPN WireGuard',
    desc: 'Gestión centralizada de túneles VPN con WireGuard. Alta velocidad, cifrado moderno y control total de peers desde un panel unificado.',
  },
  {
    icon: '🌐',
    title: 'Auditoría Web',
    desc: 'Escaneo automatizado de activos web. Detecta vulnerabilidades, puertos expuestos y configuraciones inseguras antes de que lo hagan los atacantes.',
  },
  {
    icon: '🖥️',
    title: 'Escáner de Hosts',
    desc: 'Análisis de hosts internos y externos. Inventario de activos, detección de servicios activos y evaluación continua de la superficie de ataque.',
  },
  {
    icon: '🚨',
    title: 'Gestión de Incidentes',
    desc: 'Registro, seguimiento y resolución de incidentes de seguridad. Priorización por severidad y flujo de trabajo integrado para equipos SOC.',
  },
]

function SolucionesSection() {
  return (
    <section id="soluciones" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-[#0891B2] uppercase">Plataforma</span>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }} className="text-4xl text-[#0A2540] mt-2">NUESTRAS SOLUCIONES</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm">Todo lo que necesitas para proteger tu infraestructura, desde una sola plataforma.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SOLUCIONES.map(s => (
            <div key={s.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:-translate-y-1 transition-transform">
              <div className="text-3xl mb-4">{s.icon}</div>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }} className="text-lg text-[#0A2540] uppercase mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Tecnología ────────────────────────────────────────────────────────────────

const TECH_ITEMS = [
  { label: 'Detección con IA', desc: 'Modelos de machine learning entrenados para identificar patrones de ataque en tiempo real.' },
  { label: 'Cifrado extremo a extremo', desc: 'WireGuard con claves rotativas. Todo el tráfico cifrado con estándares militares.' },
  { label: 'Monitoreo 24/7', desc: 'Alertas automáticas, dashboards en vivo y métricas de seguridad siempre actualizadas.' },
  { label: 'Cumplimiento normativo', desc: 'Compatible con ISO 27001, GDPR y ENS. Reportes automáticos para auditorías.' },
  { label: 'Arquitectura Zero Trust', desc: 'Ningún usuario ni dispositivo es de confianza por defecto. Verificación continua de identidad.' },
  { label: 'API REST abierta', desc: 'Integración con tus herramientas existentes: SIEM, ticketing, Slack, y más.' },
]

function TecnologiaSection() {
  return (
    <section id="tecnología" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#0891B2] uppercase">Stack</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }} className="text-4xl text-[#0A2540] mt-2 mb-4">TECNOLOGÍA DE VANGUARDIA</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Xylofence está construido sobre tecnologías open source de probada eficacia, combinadas con inteligencia artificial para ofrecer protección adaptativa.
            </p>
            <div className="flex flex-wrap gap-3">
              {['FastAPI', 'WireGuard', 'React', 'SQLite / PostgreSQL', 'Docker', 'Python 3.11+'].map(t => (
                <span key={t} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#0A2540] text-white tracking-wide">{t}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TECH_ITEMS.map(item => (
              <div key={item.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#0891B2]" />
                  <span className="text-xs font-bold text-[#0A2540] uppercase tracking-wide">{item.label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-4">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Nosotros ──────────────────────────────────────────────────────────────────

function NosotrosSection() {
  return (
    <section id="nosotros" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#0891B2] uppercase">Quiénes somos</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }} className="text-4xl text-[#0A2540] mt-2 mb-6">CIBERSEGURIDAD QUE<br />CRECE CONTIGO.</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              Xylofence nace de la fusión entre la gestión de redes privadas y la auditoría de seguridad ofensiva. Nuestra misión es democratizar la ciberseguridad empresarial: herramientas de nivel profesional, accesibles para pymes y MSPs.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed">
              Como el árbol que inspira nuestro nombre, nuestra plataforma crece y se adapta con cada amenaza, reforzando sus raíces digitales para proteger lo que más importa.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { num: '100%', label: 'Open source core' },
              { num: '24/7', label: 'Monitoreo continuo' },
              { num: '< 1s', label: 'Tiempo de alerta' },
              { num: '∞', label: 'Escalabilidad' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }} className="text-4xl text-[#0A2540]">{stat.num}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Contacto ──────────────────────────────────────────────────────────────────

function ContactoSection() {
  return (
    <section id="contacto" className="py-20 bg-[#0A2540]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <span className="text-xs font-bold tracking-widest text-[#0891B2] uppercase">Contacto</span>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }} className="text-4xl text-white mt-2 mb-3">¿HABLAMOS?</h2>
        <p className="text-slate-400 text-sm mb-10">Cuéntanos tu situación. Sin compromiso, sin spam.</p>
        <form className="space-y-4 text-left" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Nombre" required
              className="w-full bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0891B2] transition-colors" />
            <input type="email" placeholder="Email" required
              className="w-full bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0891B2] transition-colors" />
          </div>
          <input type="text" placeholder="Empresa (opcional)"
            className="w-full bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0891B2] transition-colors" />
          <textarea rows={4} placeholder="¿En qué podemos ayudarte?" required
            className="w-full bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0891B2] transition-colors resize-none" />
          <button type="submit"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: '0.1em' }}
            className="w-full bg-[#FACC15] text-[#0A2540] py-3 rounded-xl text-sm uppercase hover:bg-yellow-400 transition-colors">
            ENVIAR MENSAJE
          </button>
        </form>
        <p className="text-slate-500 text-xs mt-8">xylofence.blockself.net · © 2025 Xylofence Cybersecurity</p>
      </div>
    </section>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4 border border-gray-100 hover:-translate-y-1 transition-transform">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center border-2 border-blue-900 shrink-0 overflow-hidden">
          <img src={icon} alt={title} className="w-10 h-10 object-contain" />
        </div>
        <h3 className="font-extrabold text-[#0A2540] text-lg uppercase leading-tight whitespace-pre-line">
          {title}
        </h3>
      </div>
      <p className="text-sm text-gray-500 font-medium">{desc}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden">
      <Navbar onLogin={() => navigate('/login')} />
      <Hero />
      <div id="inicio" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map(card => <FeatureCard key={card.title} {...card} />)}
        </div>
      </div>
      <SolucionesSection />
      <TecnologiaSection />
      <NosotrosSection />
      <ContactoSection />
    </div>
  )
}
