from dataclasses import dataclass

import httpx

from app.config import get_settings


@dataclass
class RequestBudget:
    max_requests: int
    used: int = 0

    def consume(self) -> None:
        if self.used >= self.max_requests:
            raise RuntimeError("Presupuesto de peticiones agotado para este escaneo.")
        self.used += 1


class SafeHttpClient:
    def __init__(self, budget: RequestBudget):
        settings = get_settings()
        self.timeout = settings.http_timeout_seconds
        self.budget = budget
        self.headers = {
            "User-Agent": "Xylofence/1.0 defensive-security-validation",
            "X-Security-Tool": "Xylofence",
        }

    async def get(self, url: str, **kwargs) -> httpx.Response:
        self.budget.consume()
        headers = self.headers | kwargs.pop("headers", {})
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            return await client.get(url, headers=headers, **kwargs)

    async def head(self, url: str, **kwargs) -> httpx.Response:
        self.budget.consume()
        headers = self.headers | kwargs.pop("headers", {})
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            return await client.head(url, headers=headers, **kwargs)

    async def options(self, url: str, **kwargs) -> httpx.Response:
        self.budget.consume()
        headers = self.headers | kwargs.pop("headers", {})
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            return await client.options(url, headers=headers, **kwargs)
