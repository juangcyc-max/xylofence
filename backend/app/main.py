from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, init_db
from app.models import User
from app.routers import assets, audit, auth, configs, host_scans, incidents, invitations, peers, scans, servers, telemetry, users, vpn_nodes
from app.security.auth import hash_password

settings = get_settings()


def seed_initial_admin():
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == settings.admin_email))
        if existing:
            return
        admin = User(
            email=settings.admin_email,
            full_name=settings.admin_full_name,
            hashed_password=hash_password(settings.admin_password),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Plataforma de ciberseguridad empresarial — VPN y auditoría de activos web.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    seed_initial_admin()


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}


# VPN
app.include_router(auth.router)
app.include_router(invitations.router)
app.include_router(users.router)
app.include_router(servers.router)
app.include_router(peers.router)
app.include_router(configs.router)
app.include_router(audit.router)
app.include_router(telemetry.router)
app.include_router(vpn_nodes.router)

# Security
app.include_router(assets.router)
app.include_router(scans.router)
app.include_router(incidents.router)
app.include_router(host_scans.router)
