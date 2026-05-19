# Xylofence

Plataforma de ciberseguridad empresarial que combina:

- **VPN cloud multi-hop** sobre WireGuard + Xray Reality, con aprovisionamiento automático en Vultr.
- **Auditoría de seguridad web** (TLS, cookies, cabeceras HTTP, métodos, telemetría) con promoción automática a incidentes.
- **Escaneo de hosts** (puertos top, banner grabbing, scoring de riesgo).
- **Gestión de identidad** con JWT, invitaciones, audit log y roles (admin / manager / viewer / client).

## Stack

| Capa       | Tecnología |
|------------|-----------|
| Backend    | FastAPI · SQLAlchemy 2 · Pydantic v2 · SQLite (dev) |
| Frontend   | React 18 · Vite 6 · TypeScript · Tailwind · Radix UI · TanStack Query · Zustand |
| Cripto VPN | WireGuard (X25519) · Xray Reality (X25519) |
| Cloud      | Vultr API + cloud-init + SSH |
| Despliegue | Docker Compose (backend Python + frontend nginx) |

## Estructura

```
xylofence/
├── backend/app/
│   ├── routers/        # endpoints REST (vpn, security, auth, audit, telemetry)
│   ├── services/       # vultr, vps_ssh, wireguard_config, host_scanner, ...
│   ├── scanners/       # checks de auditoría web (tls, cookies, headers, ...)
│   ├── security/       # auth JWT, allowlist, generación de claves
│   ├── models.py       # SQLAlchemy
│   └── main.py
├── frontend/src/
│   ├── pages/{vpn,security}/
│   ├── components/{vpn,ui,layout}/
│   ├── hooks/  store/  lib/
├── node_agent/         # agente opcional para nodos WireGuard (dry-run por defecto)
├── docker-compose.yml
└── Dockerfile          # imagen backend
```

## Arranque rápido (Docker Compose)

```bash
cp .env.example .env
# edita .env con SECRET_KEY, ADMIN_PASSWORD, VULTR_API_KEY, ...

docker compose up -d --build
```

- API: http://localhost:8000 · docs en `/docs`
- Frontend: http://localhost:5173

## Arranque en desarrollo

**Backend**:
```bash
python -m venv .venv
.venv/Scripts/activate          # o source .venv/bin/activate
pip install -r requirements.txt
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Variables de entorno

Mínimas para arrancar (ver `.env.example` completo):

| Variable | Ejemplo | Notas |
|----------|---------|-------|
| `SECRET_KEY` | `<64+ chars random>` | **Cambiar antes de producción.** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@…` / `…` | Admin sembrado al primer arranque. |
| `DATABASE_URL` | `sqlite:///./xylofence.db` | Para prod usar PostgreSQL. |
| `CORS_ORIGINS` | `https://app.example.com` | Lista separada por comas. |
| `ALLOWED_HOSTS` | `example.com,api.example.com` | Hosts permitidos para auditoría. |
| `VULTR_API_KEY` | `…` | Necesaria para el VPN cloud. |
| `APP_BASE_URL` | `https://app.example.com` | Para construir links de invitación. |
| `INCIDENT_MIN_SEVERITY` | `high` | Severidad mínima para crear incidente. |

## Endpoints principales

| Dominio | Endpoints |
|---------|-----------|
| Auth | `POST /auth/login`, `POST /auth/invite`, `POST /auth/register/{token}` |
| VPN WireGuard | `GET/POST /servers`, `GET/POST /peers`, `GET /configs/peer/{id}` |
| VPN Cloud | `POST /vpn/nodes`, `POST /vpn/nodes/chain/apply`, `GET /vpn/nodes/subscription` |
| Seguridad | `GET/POST /assets`, `POST /scans`, `GET /findings`, `GET/POST /incidents` |
| Hosts | `POST /host-scans`, `GET /host-scans/{id}` |
| Telemetría | `POST /telemetry/connection-events` |
| Auditoría | `GET /audit` |

Documentación interactiva: `http://localhost:8000/docs`.

## Roles

- **admin**: control total (usuarios, invitaciones, servidores, audit).
- **manager**: gestión operativa (peers, servidores, assets, scans).
- **viewer**: lectura.
- **client**: solo `MyPage` con sus dispositivos VPN.

## Modelo de auditoría web

Cada scan run ejecuta un perfil de checks:

- `passive` → TLS, cookies, cabeceras
- `safe_active` → todo lo anterior + OPTIONS + telemetry probe

Cualquier finding con severidad ≥ `INCIDENT_MIN_SEVERITY` crea automáticamente un `Incident` open vinculado al finding.

**Allowlist**: solo se pueden escanear hosts en `ALLOWED_HOSTS`, sus subdominios, o assets marcados como `authorized=true` por un admin.

## Notas de seguridad

- El `.env` **nunca** se commitea (está en `.gitignore`). El `.env.example` muestra qué hace falta.
- Los defaults de `SECRET_KEY` y `ADMIN_PASSWORD` son inseguros a propósito para forzar configuración explícita antes de producción.
- Los tokens JWT se guardan en `localStorage` (revisar si es aceptable en tu modelo de amenazas; XSS lo expone).
- El node agent corre en **dry-run** salvo que se exporte `APPLY_CHANGES=true`.
- La subscription URL del VPN cloud incluye token JWT en la query string — no compartir.

## Roadmap conocido

- Refresh tokens + blacklist de revocación.
- Auditar login fallidos, cambios de rol y `is_active`.
- Migrar de SQLite a PostgreSQL para producción.
- Rate limiting en login.
- IPAM con transacción aislada (evitar race en asignación de IPs concurrentes).
- Watchdog para host scans en background.
- Reemplazar `StrictHostKeyChecking=no` en SSH con `known_hosts` persistido.

## Licencia

MIT — ver [LICENSE](LICENSE).
