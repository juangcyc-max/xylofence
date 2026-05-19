from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Xylofence"
    environment: str = "dev"
    database_url: str = "sqlite:///./xylofence.db"
    secret_key: str = "change-this-secret-key-in-production"
    access_token_expire_minutes: int = 480
    admin_email: str = "admin@xylofence.com"
    admin_password: str = "ChangeMe123!"
    admin_full_name: str = "Admin Xylofence"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    allowed_hosts: str = "localhost,127.0.0.1"
    http_timeout_seconds: int = 8
    max_requests_per_scan: int = 12
    auto_create_incidents: bool = True
    incident_min_severity: str = "high"
    vultr_api_key: str = ""
    app_base_url: str = "http://localhost:5173"
    invitation_expire_hours: int = 72

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        items = [x.strip() for x in self.cors_origins.split(",") if x.strip()]
        return items if items else ["http://localhost:5173", "http://localhost:3000"]

    @property
    def allowed_host_list(self) -> list[str]:
        return [h.strip().lower() for h in self.allowed_hosts.split(",") if h.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
